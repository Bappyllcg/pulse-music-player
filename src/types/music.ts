export type RepeatMode = 'off' | 'all' | 'one'

/** Shape of a row persisted in the `tracks` IndexedDB object store. */
export interface TrackRecord {
  id: string
  title: string
  artist: string
  duration: number
  /** Audio bytes for user-imported local files. */
  blob?: Blob
  /** Optional embedded album art extracted from ID3 APIC frame. */
  coverBlob?: Blob
  /** Remote URL for streamed tracks. */
  remoteUrl?: string
  coverUrl: string
  createdAt: number
}

/** A track ready for playback: the stored record plus a resolved `src`. */
export interface PlayableTrack extends Omit<TrackRecord, 'blob'> {
  /** Revocable object URL (local) or remote URL (stream). */
  src: string
  kind: 'local' | 'stream'
}

export interface ImportResult {
  added: number
  skipped: string[]
  duplicates: number
}
