import { redirect } from 'react-router'

/** /admin, the easy way to remember the back office: the Sanity Studio, which Sanity hosts (see studio/). */
export function loader() {
  return redirect('https://clubcasa.sanity.studio')
}
