interface PageHeadProps {
  title: string
  subtitle: string
}

export function PageHead({ title, subtitle }: PageHeadProps) {
  return (
    <div className="mb-6">
      <h2 className="text-[22px] leading-tight font-bold tracking-tight text-primary">
        {title}
      </h2>
      <p className="mt-1 text-[13px] text-muted-foreground">{subtitle}</p>
    </div>
  )
}
