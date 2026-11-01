import { nextTick, onBeforeUnmount, ref, watch, type Ref } from 'vue'

export function useHorizontalScroll(containerRef: Ref<HTMLElement | null>) {
  const canScrollLeft = ref(false)
  const canScrollRight = ref(false)
  const isDragging = ref(false)
  let startX = 0
  let scrollStartX = 0
  let dragMoved = false
  let resetDragTimer: ReturnType<typeof setTimeout> | null = null
  let resizeObserver: ResizeObserver | null = null

  function updateScrollState() {
    const el = containerRef.value
    if (!el) {
      canScrollLeft.value = false
      canScrollRight.value = false
      return
    }
    // Tolerant comparison for subpixel rendering
    canScrollLeft.value = el.scrollLeft > 6
    canScrollRight.value = el.scrollLeft + el.clientWidth < el.scrollWidth - 6
  }

  function onWheel(e: WheelEvent) {
    const el = containerRef.value
    if (!el) return
    // When scrolling vertically over horizontal container, translate deltaY to horizontal scrollLeft
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && el.scrollWidth > el.clientWidth) {
      e.preventDefault()
      el.scrollLeft += e.deltaY * 1.2
      updateScrollState()
    }
  }

  function onMouseDown(e: MouseEvent) {
    const el = containerRef.value
    if (!el || e.button !== 0) return
    if (resetDragTimer) clearTimeout(resetDragTimer)
    isDragging.value = true
    dragMoved = false
    startX = e.pageX - el.offsetLeft
    scrollStartX = el.scrollLeft
  }

  function onMouseMove(e: MouseEvent) {
    if (!isDragging.value) return
    const el = containerRef.value
    if (!el) return
    e.preventDefault()
    const x = e.pageX - el.offsetLeft
    const walk = (x - startX) * 1.3
    if (Math.abs(walk) > 5) {
      dragMoved = true
    }
    el.scrollLeft = scrollStartX - walk
    updateScrollState()
  }

  function onMouseUp() {
    if (!isDragging.value) return
    isDragging.value = false
    // Keep dragMoved true for 80ms so subsequent click event knows it was a drag gesture
    resetDragTimer = setTimeout(() => {
      dragMoved = false
    }, 80)
  }

  function scrollByDelta(delta: number) {
    const el = containerRef.value
    if (!el) return
    el.scrollBy({ left: delta, behavior: 'smooth' })
    setTimeout(updateScrollState, 260)
  }

  function scrollLeft() {
    const el = containerRef.value
    const step = el ? Math.max(160, el.clientWidth * 0.6) : 240
    scrollByDelta(-step)
  }

  function scrollRight() {
    const el = containerRef.value
    const step = el ? Math.max(160, el.clientWidth * 0.6) : 240
    scrollByDelta(step)
  }

  function isDragClick(): boolean {
    return dragMoved
  }

  function scrollActiveIntoView(selector = '[data-active="true"]') {
    nextTick(() => {
      const container = containerRef.value
      if (!container) return
      const activeEl = container.querySelector(selector) as HTMLElement | null
      if (activeEl) {
        // Calculate offset to center the element
        const containerWidth = container.clientWidth
        const itemLeft = activeEl.offsetLeft
        const itemWidth = activeEl.clientWidth
        const targetScroll = itemLeft - (containerWidth / 2) + (itemWidth / 2)
        container.scrollTo({
          left: Math.max(0, targetScroll),
          behavior: 'smooth',
        })
        setTimeout(updateScrollState, 280)
      }
    })
  }

  function attachListeners(el: HTMLElement) {
    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('scroll', updateScrollState, { passive: true })
    el.addEventListener('mousedown', onMouseDown)

    if (window.ResizeObserver) {
      resizeObserver = new ResizeObserver(() => {
        updateScrollState()
      })
      resizeObserver.observe(el)
    }

    nextTick(() => {
      updateScrollState()
      setTimeout(updateScrollState, 200)
    })
  }

  function detachListeners(el: HTMLElement) {
    el.removeEventListener('wheel', onWheel)
    el.removeEventListener('scroll', updateScrollState)
    el.removeEventListener('mousedown', onMouseDown)
    if (resizeObserver) {
      resizeObserver.disconnect()
      resizeObserver = null
    }
  }

  window.addEventListener('mouseup', onMouseUp)
  window.addEventListener('mousemove', onMouseMove)

  watch(
    containerRef,
    (newEl, oldEl) => {
      if (oldEl) detachListeners(oldEl)
      if (newEl) attachListeners(newEl)
    },
    { immediate: true },
  )

  onBeforeUnmount(() => {
    if (containerRef.value) {
      detachListeners(containerRef.value)
    }
    window.removeEventListener('mouseup', onMouseUp)
    window.removeEventListener('mousemove', onMouseMove)
    if (resetDragTimer) clearTimeout(resetDragTimer)
  })

  return {
    canScrollLeft,
    canScrollRight,
    isDragging,
    scrollLeft,
    scrollRight,
    updateScrollState,
    isDragClick,
    scrollActiveIntoView,
  }
}
