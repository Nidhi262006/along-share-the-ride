export default function PageFrame({ kicker, title, subtitle, children, width = "max-w-5xl" }) {
  return (
    <div className={`mx-auto w-full px-4 py-8 sm:px-6 lg:px-10 ${width}`}>
      {(kicker || title || subtitle) && (
        <header className="mb-8">
          {kicker && <p className="along-kicker">{kicker}</p>}
          {title && <h1 className={`along-title ${kicker ? "mt-3" : ""}`}>{title}</h1>}
          {subtitle && <p className="mt-3 max-w-xl text-sm leading-6 text-[#8a8498]">{subtitle}</p>}
        </header>
      )}
      {children}
    </div>
  );
}
