interface Props {
  size?: 'sm' | 'md' | 'lg'
}

export default function TilapiaLogo({ size = 'md' }: Props) {
  const configs = {
    sm: { box: 'w-20 h-20 rounded-lg',  title: 'text-base', sub: 'text-[8px]' },
    md: { box: 'w-28 h-28 rounded-xl',  title: 'text-xl',   sub: 'text-[10px]' },
    lg: { box: 'w-36 h-36 rounded-2xl', title: 'text-2xl',  sub: 'text-xs' },
  }
  const c = configs[size]

  return (
    <div className={`${c.box} bg-[#1E3A6E] flex flex-col items-center justify-center`}>
      <div className={`flex items-baseline gap-0 font-black tracking-tight leading-none ${c.title}`}>
        <span className="text-white">TILAP</span>
        <span className="text-[#94C4E8]">IA</span>
      </div>
      <div className={`text-white/60 font-medium tracking-widest uppercase mt-1 ${c.sub}`}>
        Standard
      </div>
    </div>
  )
}
