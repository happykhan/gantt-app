import '@testing-library/jest-dom'

if (!window.matchMedia) {
  window.matchMedia = query => ({
    matches: window.innerWidth >= 768,
    media: query,
    addEventListener() {},
    removeEventListener() {},
  })
}
