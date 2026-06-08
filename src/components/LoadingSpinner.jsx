const LoadingSpinner = ({ fullScreen = false, size = 'default', text = '' }) => {
  const sizeClasses = {
    small: 'w-8 h-8',
    default: 'w-14 h-14',
    large: 'w-20 h-20'
  }

  const spinner = (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="relative">
        {/* Outer glow */}
        <div className={`
          ${sizeClasses[size]}
          rounded-full
          bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500
          animate-spin
          opacity-30
          blur-md
        `} />
        {/* Main spinner */}
        <div className={`
          ${sizeClasses[size]}
          absolute inset-0
          rounded-full
          border-4 border-white/20
          border-t-white
          animate-spin
        `} />
        {/* Inner glow */}
        <div className={`
          absolute inset-2
          rounded-full
          bg-gradient-to-br from-pink-500/20 to-purple-500/20
          backdrop-blur-sm
        `} />
      </div>
      {text && (
        <p className="text-white font-medium animate-pulse-soft">{text}</p>
      )}
    </div>
  )

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center z-50">
        <div className="text-center">
          <div className="text-6xl mb-6 animate-bounce-in">🎯</div>
          {spinner}
        </div>
      </div>
    )
  }

  return spinner
}

export default LoadingSpinner
