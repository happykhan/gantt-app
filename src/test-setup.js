import '@testing-library/jest-dom'

class MemoryStorage {
  #values = new Map()

  get length() {
    return this.#values.size
  }

  clear() {
    this.#values.clear()
  }

  getItem(key) {
    return this.#values.has(String(key)) ? this.#values.get(String(key)) : null
  }

  key(index) {
    return [...this.#values.keys()][index] ?? null
  }

  removeItem(key) {
    this.#values.delete(String(key))
  }

  setItem(key, value) {
    this.#values.set(String(key), String(value))
  }
}

const localStorageMock = new MemoryStorage()
const sessionStorageMock = new MemoryStorage()

Object.defineProperty(window, 'localStorage', {
  configurable: true,
  value: localStorageMock,
})

Object.defineProperty(window, 'sessionStorage', {
  configurable: true,
  value: sessionStorageMock,
})

Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: localStorageMock,
})

Object.defineProperty(globalThis, 'sessionStorage', {
  configurable: true,
  value: sessionStorageMock,
})

if (!window.matchMedia) {
  window.matchMedia = query => ({
    matches: window.innerWidth >= 768,
    media: query,
    addEventListener() {},
    removeEventListener() {},
  })
}
