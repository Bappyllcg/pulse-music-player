import { computed, ref } from 'vue'
import type { ImportResult, PlayableTrack, TrackRecord } from '../types/music'

const DB_NAME = 'PulseAudioDB'
const DB_VERSION = 1
const STORE_NAME = 'tracks'
const MAX_ID3_BYTES = 4 * 1024 * 1024
const METADATA_TIMEOUT_MS = 8000

const MIME_BY_EXTENSION: Record<string, string> = {
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  wav: 'audio/wav',
  wave: 'audio/wav',
  ogg: 'audio/ogg',
  oga: 'audio/ogg',
  flac: 'audio/flac',
}

/* ------------------------------------------------------------------ */
/* Shared reactive state (module-level singleton)                      */
/* ------------------------------------------------------------------ */

const tracks = ref<PlayableTrack[]>([])
const isReady = ref(false)
const isImporting = ref(false)
const objectUrls = new Map<string, string>()

/* ------------------------------------------------------------------ */
/* IndexedDB helpers                                                   */
/* ------------------------------------------------------------------ */

let dbPromise: Promise<IDBDatabase> | null = null

function openDatabase(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB is not available in this browser.'))
        return
      }
      const request = indexedDB.open(DB_NAME, DB_VERSION)
      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        }
      }
      request.onsuccess = () => {
        const db = request.result
        db.onversionchange = () => {
          db.close()
          dbPromise = null
        }
        resolve(db)
      }
      request.onerror = () => {
        dbPromise = null
        reject(request.error ?? new Error('Failed to open PulseAudioDB.'))
      }
    })
  }
  return dbPromise
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed.'))
  })
}

function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed.'))
    tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted.'))
  })
}

export async function putRecord(record: TrackRecord): Promise<void> {
  return putRecords([record])
}

export async function putRecords(records: TrackRecord[]): Promise<void> {
  if (records.length === 0) return
  const db = await openDatabase()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  const store = tx.objectStore(STORE_NAME)
  for (const record of records) {
    store.put(record)
  }
  await transactionDone(tx)
}

async function deleteRecord(id: string): Promise<void> {
  const db = await openDatabase()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  tx.objectStore(STORE_NAME).delete(id)
  await transactionDone(tx)
}

async function readAllRecords(): Promise<TrackRecord[]> {
  const db = await openDatabase()
  const tx = db.transaction(STORE_NAME, 'readonly')
  const records = await requestToPromise(tx.objectStore(STORE_NAME).getAll() as IDBRequest<TrackRecord[]>)
  return records.sort((a, b) => a.createdAt - b.createdAt)
}

/* ------------------------------------------------------------------ */
/* Metadata helpers                                                    */
/* ------------------------------------------------------------------ */

function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

function getExtension(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot === -1 ? '' : name.slice(dot + 1).toLowerCase()
}

/** Resolves supported audio MIME, strictly rejecting video containers (.mp4, .mov, etc.) */
function resolveAudioMime(file: File): string | null {
  if (file.type && file.type.startsWith('video/')) return null
  const ext = getExtension(file.name)
  if (['mp4', 'mov', 'avi', 'mkv', 'webm', '3gp'].includes(ext)) {
    if (file.type && file.type.startsWith('audio/')) return file.type
    return null
  }
  const byExtension = MIME_BY_EXTENSION[ext]
  if (byExtension) return byExtension
  return file.type && file.type.startsWith('audio/') ? file.type : null
}

/** Derives a clean title/artist pair from a filename such as "01 - Artist - Song_Name.mp3". */
function parseFilename(name: string): { title: string; artist: string } {
  let base = name
    .replace(/\.[^./\\]+$/, '')
    .replace(/[_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  base = base.replace(/^\d{1,3}\s*[-.)]\s+/, '')
  if (/^\d{1,3}\s+\S/.test(base) && base.includes(' - ')) {
    base = base.replace(/^\d{1,3}\s+/, '')
  }
  const separator = base.indexOf(' - ')
  if (separator > 0 && separator < base.length - 3) {
    return {
      artist: base.slice(0, separator).trim(),
      title: base.slice(separator + 3).trim(),
    }
  }
  return { title: base || 'Untitled', artist: 'Unknown Artist' }
}

function synchsafe(bytes: Uint8Array, offset: number): number {
  return (
    ((bytes[offset] & 0x7f) << 21) |
    ((bytes[offset + 1] & 0x7f) << 14) |
    ((bytes[offset + 2] & 0x7f) << 7) |
    (bytes[offset + 3] & 0x7f)
  )
}

function uint32(bytes: Uint8Array, offset: number): number {
  return (
    ((bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3]) >>> 0
  )
}

function decodeId3Text(data: Uint8Array): string {
  if (data.length < 2) return ''
  const encoding = data[0]
  const body = data.subarray(1)
  let label = 'windows-1252'
  if (encoding === 1) {
    if (body[0] === 0xfe && body[1] === 0xff) {
      label = 'utf-16be'
    } else {
      label = 'utf-16le'
    }
  } else if (encoding === 2) {
    label = 'utf-16be'
  } else if (encoding === 3) {
    label = 'utf-8'
  }
  const decoded = new TextDecoder(label).decode(body)
  return decoded.split('\u0000').map((part) => part.trim()).find((part) => part.length > 0) ?? ''
}

interface Id3Tags {
  title?: string
  artist?: string
  coverBlob?: Blob
}

/** Minimal ID3v2.3 / v2.4 reader for title (TIT2), artist (TPE1), and embedded artwork (APIC). */
async function readId3Tags(file: Blob): Promise<Id3Tags> {
  try {
    const header = new Uint8Array(await file.slice(0, 10).arrayBuffer())
    const isId3 = header[0] === 0x49 && header[1] === 0x44 && header[2] === 0x33
    const major = header[3]
    if (!isId3 || (major !== 3 && major !== 4)) return {}

    const tagSize = Math.min(synchsafe(header, 6), MAX_ID3_BYTES)
    const buffer = new Uint8Array(await file.slice(10, 10 + tagSize).arrayBuffer())
    const result: Id3Tags = {}

    let offset = 0
    if (header[5] & 0x40 && buffer.length >= 4) {
      offset = major === 4 ? synchsafe(buffer, 0) : uint32(buffer, 0) + 4
    }

    while (offset + 10 <= buffer.length) {
      const id = String.fromCharCode(buffer[offset], buffer[offset + 1], buffer[offset + 2], buffer[offset + 3])
      if (!/^[A-Z0-9]{4}$/.test(id)) break
      const frameSize = major === 4 ? synchsafe(buffer, offset + 4) : uint32(buffer, offset + 4)
      const start = offset + 10
      const end = start + frameSize
      if (frameSize <= 0 || end > buffer.length) break

      if (id === 'TIT2') {
        result.title = decodeId3Text(buffer.subarray(start, end))
      } else if (id === 'TPE1') {
        result.artist = decodeId3Text(buffer.subarray(start, end))
      } else if (id === 'APIC' && !result.coverBlob) {
        try {
          const encoding = buffer[start]
          let p = start + 1
          while (p < end && buffer[p] !== 0) p++
          const mimeStr = new TextDecoder('latin1').decode(buffer.subarray(start + 1, p)) || 'image/jpeg'
          p++
          if (p < end) {
            p++ // skip picture type
            if (encoding === 1 || encoding === 2) {
              while (p + 1 < end && !(buffer[p] === 0 && buffer[p + 1] === 0)) p += 2
              p += 2
            } else {
              while (p < end && buffer[p] !== 0) p++
              p++
            }
            if (p < end) {
              const imgBytes = buffer.slice(p, end)
              const mime = mimeStr.toLowerCase().startsWith('image/') ? mimeStr : 'image/jpeg'
              result.coverBlob = new Blob([imgBytes], { type: mime })
            }
          }
        } catch {
          /* ignore APIC parse errors */
        }
      }

      if (result.title && result.artist && result.coverBlob) break
      offset = end
    }
    return result
  } catch {
    return {}
  }
}

/** Resolves with the duration in seconds, 0 on timeout, or null if the file cannot be decoded. */
function readDuration(url: string): Promise<number | null> {
  return new Promise<number | null>((resolve) => {
    const probe = new Audio()
    probe.preload = 'metadata'
    let settled = false

    const finish = (value: number | null) => {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      probe.removeAttribute('src')
      probe.load()
      resolve(value)
    }

    const timer = window.setTimeout(() => finish(0), METADATA_TIMEOUT_MS)
    probe.addEventListener(
      'loadedmetadata',
      () => finish(Number.isFinite(probe.duration) ? probe.duration : 0),
      { once: true },
    )
    probe.addEventListener('error', () => finish(null), { once: true })
    probe.src = url
  })
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (ch) => {
    switch (ch) {
      case '<':
        return '&lt;'
      case '>':
        return '&gt;'
      case '&':
        return '&amp;'
      case '\'':
        return '&apos;'
      case '"':
        return '&quot;'
      default:
        return ch
    }
  })
}

/**
 * Compact, lightweight SVG gradient vector artwork (~350 bytes data URL)
 * Replacing heavy 50KB PNG data URLs for ultra-fast storage and crisp retina rendering.
 */
function createCover(seed: string, label: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  const hue = hash % 360
  const hue2 = (hue + 55) % 360
  const rawInitial = (label.trim().charAt(0) || '♪').toUpperCase()
  const initial = escapeXml(rawInitial)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="hsl(${hue},75%,52%)"/><stop offset="100%" stop-color="hsl(${hue2},70%,22%)"/></linearGradient></defs><rect width="512" height="512" fill="url(#g)"/><circle cx="400" cy="120" r="170" fill="white" fill-opacity="0.1"/><circle cx="90" cy="460" r="210" fill="black" fill-opacity="0.18"/><text x="256" y="295" font-family="-apple-system,BlinkMacSystemFont,'SF Pro Display',sans-serif" font-weight="700" font-size="240" fill="white" fill-opacity="0.95" text-anchor="middle" dominant-baseline="middle">${initial}</text></svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

/* ------------------------------------------------------------------ */
/* Track construction                                                  */
/* ------------------------------------------------------------------ */

function revokeAllObjectUrls(): void {
  for (const url of objectUrls.values()) URL.revokeObjectURL(url)
  objectUrls.clear()
}

function toPlayable(record: TrackRecord): PlayableTrack | null {
  const { blob, coverBlob, ...rest } = record
  let coverUrl = record.coverUrl
  if (coverBlob) {
    coverUrl = URL.createObjectURL(coverBlob)
    objectUrls.set(record.id + '_cover', coverUrl)
  }
  if (blob) {
    const src = URL.createObjectURL(blob)
    objectUrls.set(record.id, src)
    return { ...rest, coverUrl, src, kind: 'local' }
  }
  if (record.remoteUrl) {
    return { ...rest, coverUrl, src: record.remoteUrl, kind: 'stream' }
  }
  return null
}

/* ------------------------------------------------------------------ */
/* Public composable                                                   */
/* ------------------------------------------------------------------ */

export function useAudioStorage() {
  const localCount = computed(() => tracks.value.filter((track) => track.kind === 'local').length)

  /** Loads every persisted local track from IndexedDB (empty library if none). */
  async function getAllTracks(): Promise<PlayableTrack[]> {
    let loaded: PlayableTrack[] = []
    try {
      const records = await readAllRecords()
      revokeAllObjectUrls()
      loaded = records.map(toPlayable).filter((track): track is PlayableTrack => track !== null)
    } catch (error) {
      console.warn('[Pulse] Could not read the local library:', error)
    }
    tracks.value = loaded
    isReady.value = true
    return tracks.value
  }

  /** Imports files chosen from the Files app, persisting each as a Blob in IndexedDB. */
  async function addFiles(files: FileList | File[]): Promise<ImportResult> {
    const result: ImportResult = { added: 0, skipped: [], duplicates: 0 }
    const added: PlayableTrack[] = []
    const recordsToPut: TrackRecord[] = []
    isImporting.value = true

    try {
      for (const file of Array.from(files)) {
        const mime = resolveAudioMime(file)
        if (!mime) {
          result.skipped.push(file.name)
          continue
        }

        const blob = file.slice(0, file.size, mime)
        const url = URL.createObjectURL(blob)
        const duration = await readDuration(url)
        if (duration === null) {
          URL.revokeObjectURL(url)
          result.skipped.push(file.name)
          continue
        }

        const fromName = parseFilename(file.name)
        const tags = await readId3Tags(blob)
        const title = tags.title || fromName.title
        const artist = tags.artist || fromName.artist

        // Prevent duplicate imports (matching title & artist, or duration within 2s)
        const isDuplicate = tracks.value.some((existing) => {
          const sameTitle = existing.title.trim().toLowerCase() === title.trim().toLowerCase()
          const sameArtist = existing.artist.trim().toLowerCase() === artist.trim().toLowerCase()
          const sameDuration = Math.abs(existing.duration - duration) < 2
          return sameTitle && (sameArtist || sameDuration)
        })

        if (isDuplicate) {
          URL.revokeObjectURL(url)
          result.duplicates += 1
          continue
        }

        const id = createId()
        const defaultCover = createCover(`${artist}-${title}`, title)

        let coverUrl = defaultCover
        if (tags.coverBlob) {
          const coverBlobUrl = URL.createObjectURL(tags.coverBlob)
          objectUrls.set(id + '_cover', coverBlobUrl)
          coverUrl = coverBlobUrl
        }

        const record: TrackRecord = {
          id,
          title,
          artist,
          duration,
          blob,
          coverBlob: tags.coverBlob,
          coverUrl: defaultCover,
          createdAt: Date.now(),
        }

        recordsToPut.push(record)
        objectUrls.set(id, url)
        const { blob: _blob, coverBlob: _cBlob, ...rest } = record
        added.push({ ...rest, coverUrl, src: url, kind: 'local' })
        result.added += 1
      }

      if (recordsToPut.length > 0) {
        try {
          await putRecords(recordsToPut)
        } catch (error) {
          // Cleanup created object URLs on transaction failure
          for (const r of recordsToPut) {
            const u = objectUrls.get(r.id)
            if (u) { URL.revokeObjectURL(u); objectUrls.delete(r.id) }
            const cu = objectUrls.get(r.id + '_cover')
            if (cu) { URL.revokeObjectURL(cu); objectUrls.delete(r.id + '_cover') }
          }
          throw error
        }
      }
    } finally {
      if (added.length > 0) {
        const existingLocal = tracks.value.filter((track) => track.kind === 'local')
        tracks.value = [...existingLocal, ...added]
      }
      isImporting.value = false
    }

    return result
  }

  /** Removes a local track from IndexedDB and revokes its object URLs. */
  async function deleteTrack(id: string): Promise<void> {
    const target = tracks.value.find((track) => track.id === id)
    if (!target || target.kind !== 'local') return

    await deleteRecord(id)

    const url = objectUrls.get(id)
    if (url) {
      URL.revokeObjectURL(url)
      objectUrls.delete(id)
    }
    const coverUrl = objectUrls.get(id + '_cover')
    if (coverUrl) {
      URL.revokeObjectURL(coverUrl)
      objectUrls.delete(id + '_cover')
    }

    tracks.value = tracks.value.filter((track) => track.id !== id)
  }

  /** Records a duration discovered at playback time. */
  function setTrackDuration(id: string, duration: number): void {
    const target = tracks.value.find((track) => track.id === id)
    if (target && Number.isFinite(duration) && Math.abs(target.duration - duration) > 0.5) {
      target.duration = duration
    }
  }

  return {
    tracks,
    localCount,
    isReady,
    isImporting,
    getAllTracks,
    addFiles,
    deleteTrack,
    setTrackDuration,
  }
}
