import { Link } from 'react-router-dom'

const LogoHeader = ({ 
  showTitle = true, 
  size = 'normal', 
  className = '',
  linkTo = '/'
}) => {
  const logoSize = size === 'small' ? 'w-12 h-12' : size === 'large' ? 'w-24 h-24' : 'w-16 h-16'
  const titleSize = size === 'small' ? 'text-lg' : size === 'large' ? 'text-2xl' : 'text-xl'

  return (
    <Link to={linkTo} className={`flex items-center space-x-3 ${className}`}>
      <div className="flex items-center justify-center bg-transparent">
        <img 
          src="/lovable-uploads/s2g-logo.jpg" 
          alt="sow2grow logo" 
          className={`${logoSize} object-contain bg-transparent`}
          style={{ backgroundColor: 'transparent' }}
        />
      </div>
      {showTitle && (
        <div>
          <h1 className={`${titleSize} font-bold text-s2g-green`}>sow2grow</h1>
          <p className="text-xs text-s2g-blue">364yhvh community farm</p>
        </div>
      )}
    </Link>
  )
}

export default LogoHeader