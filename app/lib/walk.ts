/**
 * The walk in, shared with what draws outside React: how close to the floor the visitor is (0 out on the street, 1
 * on the floor) and how hard the music's beat is landing there (0–1, smoothed so lamps swell rather than flash). The
 * page writes it every frame while it's open; the backdrop's lamps read it.
 */
export const walk = {
  /** Whether the walk in is on screen. */
  active: false,
  closeness: 1,
  beat: 0,
}
