interface Props {
  size?: 'sm' | 'md' | 'lg'
}

export default function TilapiaLogo({ size = 'md' }: Props) {
  const configs = {
    sm: { box: 'px-3 py-2 rounded-lg', title: 'text-base', sub: 'text-[9px]' },
    md: { box: 'px-4 py-3 rounded-xl', title: 'text-xl',   sub: 'text-[10px]' },
    lg: { box: 'px-6 py-4 rounded-2xl', title: 'text-3xl', sub: 'text-xs' },
  }
  const c = configs[size]

  return (
    <div className={`inline-flex flex-col items-center bg-[#1E3A6E] ${c.box}`}>
      <div className={`flex items-baseline gap-0 font-black tracking-tight leading-none ${c.title}`}>
        <span className="text-white">TILAP</span>
        <span className="text-[#94C4E8]">IA</span>
      </div>
      <div className={`text-white/70 font-medium tracking-widest uppercase mt-0.5 ${c.sub}`}>
        Standard
      </div>
    </div>
  )
}
