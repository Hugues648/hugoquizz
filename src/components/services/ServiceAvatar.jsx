/**
 * ServiceAvatar - shows a business/profile photo, or the initials of the name
 * on a colored gradient background when no photo is available.
 */
const GRADIENTS = [
  'from-violet-500 to-purple-600',
  'from-pink-500 to-rose-500',
  'from-amber-500 to-orange-500',
  'from-blue-500 to-cyan-500',
  'from-emerald-500 to-teal-500',
  'from-fuchsia-500 to-pink-500',
  'from-indigo-500 to-blue-600',
]

function getInitials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function gradientFor(name = '') {
  let sum = 0
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i)
  return GRADIENTS[sum % GRADIENTS.length]
}

export default function ServiceAvatar({ name = '', photoURL = '', size = 48, className = '' }) {
  const dimension = typeof size === 'number' ? `${size}px` : size
  const fontSize = typeof size === 'number' ? `${Math.round(size * 0.4)}px` : undefined

  if (photoURL) {
    return (
      <img
        src={photoURL}
        alt={name}
        className={`rounded-full object-cover ${className}`}
        style={{ width: dimension, height: dimension }}
      />
    )
  }

  return (
    <div
      className={`rounded-full bg-gradient-to-br ${gradientFor(name)} flex items-center justify-center text-white font-bold shadow-sm ${className}`}
      style={{ width: dimension, height: dimension, fontSize }}
    >
      {getInitials(name)}
    </div>
  )
}
