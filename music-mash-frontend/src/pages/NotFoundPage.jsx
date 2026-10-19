import PageShell from '../components/layout/PageShell'
import Button from '../components/ui/Button'
import { IMAGES } from '../utils/images'

const NotFoundPage = () => {
  const image = IMAGES.scenes.notFound
  return (
    <PageShell>
      <div className="page grid min-h-[calc(100vh-4rem)] items-center gap-10 py-10 lg:grid-cols-2">
        <img src={image?.src} alt={image?.alt ?? ''} width="1000" height="1250"
          className="aspect-[4/3] w-full rounded object-cover lg:aspect-[4/5]" />
        <div>
          <p className="text-display font-thin text-white">404</p>
          <h1 className="mt-4 text-heading-sm font-semibold text-white">This page went off the setlist</h1>
          <p className="mt-2 max-w-md text-body text-fog">The link may be old, or the page has moved.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button to="/">Back to home</Button>
            <Button to="/practice" variant="subtle">Go practise</Button>
          </div>
        </div>
      </div>
    </PageShell>
  )
}

export default NotFoundPage
