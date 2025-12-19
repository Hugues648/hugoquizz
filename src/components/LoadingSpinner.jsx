const LoadingSpinner = ({ fullScreen = false, size = 'default', text = '' }) => {
  const sizeClasses = {
    small: 'w-6 h-6 border-2',
    default: 'w-10 h-10 border-3',
    large: 'w-16 h-16 border-4'
  }

  const spinner = (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className={`
        ${sizeClasses[size]} 
        border-white border-t-transparent 
        rounded-full animate-spin
      `} />
      {text && <p className="text-white font-medium">{text}</p>}
    </div>
  )

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center z-50">
        {spinner}
      </div>
    )
  }

  return spinner
}

export default LoadingSpinner
