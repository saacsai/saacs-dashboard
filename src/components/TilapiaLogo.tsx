import Image from 'next/image'

interface Props {
  size?: 'sm' | 'md' | 'lg'
}

export default function TilapiaLogo({ size = 'md' }: Props) {
  const px = { sm: 120, md: 160, lg: 200 }[size]
  return (
    <Image
      src="/tilapia_standard.jpg"
      alt="TILAPIA Standard"
      width={px}
      height={px}
      className="rounded-lg"
      priority
    />
  )
}
