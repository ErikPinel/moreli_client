import { useTeacherAvatar } from '../hooks/useTeachers'

type TeacherAvatarProps = {
  slug: string
  name: string
  avatarPath: string | null
}

export function TeacherAvatar({ slug, name, avatarPath }: TeacherAvatarProps) {
  const directAvatar = avatarPath && /^(?:https?:|data:|blob:|\/)/.test(avatarPath)
    ? avatarPath
    : null
  const avatarQuery = useTeacherAvatar(slug, Boolean(avatarPath) && !directAvatar)
  const imageUrl = directAvatar ?? avatarQuery.data?.signedUrl

  return (
    <div className="teacher-avatar relative grid h-full w-full place-items-center overflow-hidden bg-[#edf3ee] text-2xl font-bold text-[#244331]">
      <span aria-hidden="true">{name.trim().charAt(0) || 'מ'}</span>
      {imageUrl ? (
      <img
        className="absolute inset-0 h-full w-full object-cover"
        src={imageUrl}
        alt={`תמונת הפרופיל של ${name}`}
        loading="lazy"
        onError={(event) => {
          event.currentTarget.hidden = true
        }}
      />
      ) : (
        <span className="sr-only">אין תמונת פרופיל עבור {name}</span>
      )}
    </div>
  )
}