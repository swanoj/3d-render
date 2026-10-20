import { isRouteErrorResponse, Link, useRouteError } from 'react-router'
import { brand } from '../brand/brand'
import { Mark } from './Mark'

/** The not-found and error message, inside the site layout. */
export function ErrorMessage({ notFound }: { notFound: boolean }) {
  return (
    <section className="error-page">
      <Mark name="mascot" className="error-mascot" />
      <p className="label">{notFound ? 'Error 404' : 'Something went wrong'}</p>
      <h1 className="hand error-title">{notFound ? 'Wrong room' : 'Lights up'}</h1>
      <p className="mono">
        {notFound
          ? `${brand.mascot.name} was here, but this page wasn’t. It doesn’t exist, or it has moved.`
          : 'Please try again in a moment.'}
      </p>
      <Link to="/" className="button button--solid" viewTransition>
        Back home
      </Link>
    </section>
  )
}

/** For a route's ErrorBoundary export: renders the thrown 404 or error inside the layout. */
export function RouteError() {
  const error = useRouteError()
  const notFound = isRouteErrorResponse(error) && error.status === 404
  if (!notFound) console.error(error)
  return <ErrorMessage notFound={notFound} />
}
