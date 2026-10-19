/** Photo banner at the top of an app page: image, dark scrim, title, description and an optional action. */
const PageBanner = ({ image, title, description, children }) => (
  <section className="relative h-48 overflow-hidden sm:h-60">
    <img src={image?.src} alt={image?.alt ?? ''} width="1600" height="700" className="absolute inset-0 h-full w-full object-cover" />
    <div className="hero-scrim absolute inset-0" aria-hidden="true" />
    <div className="page relative flex h-full flex-col justify-end gap-3 pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-heading font-thin text-white">{title}</h1>
        {description && <p className="mt-1 max-w-xl text-body-sm text-fog">{description}</p>}
      </div>
      {children}
    </div>
  </section>
)

export default PageBanner
