/**
 * UserCard 组件
 *
 * 生成过程：
 * 1. Figma MCP 读取 User/Profile 卡片设计规范
 * 2. component-generator Skill 生成组件框架
 * 3. styling-agent 填充 Tailwind CSS 样式（对照 Design Tokens）
 * 4. testing-agent 生成 UserCard.test.tsx
 */

export interface UserCardProps {
  avatar: string;
  name: string;
  username: string;
  bio?: string;
  followersCount?: number;
  isFollowing?: boolean;
  onFollow?: () => void;
  onMore?: () => void;
}

export function UserCard({
  avatar,
  name,
  username,
  bio,
  followersCount,
  isFollowing = false,
  onFollow,
  onMore,
}: UserCardProps) {
  return (
    <div className="flex items-start gap-4 p-4 rounded-xl bg-white shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <img
        src={avatar}
        alt={`${name} 的头像`}
        className="w-12 h-12 rounded-full object-cover flex-shrink-0"
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <p className="text-sm font-semibold text-gray-900 truncate">{name}</p>
        </div>
        <p className="text-sm text-gray-500">@{username}</p>

        {bio && (
          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{bio}</p>
        )}

        {followersCount !== undefined && (
          <p className="text-xs text-gray-400 mt-1">
            <span className="font-medium text-gray-700">{followersCount.toLocaleString()}</span> 位关注者
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={onFollow}
          className={[
            'px-4 py-1.5 text-sm font-medium rounded-full transition-colors',
            isFollowing
              ? 'text-gray-700 bg-gray-100 hover:bg-gray-200'
              : 'text-white bg-blue-600 hover:bg-blue-700',
          ].join(' ')}
        >
          {isFollowing ? '已关注' : '关注'}
        </button>

        <button
          onClick={onMore}
          aria-label="更多操作"
          className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
        >
          ···
        </button>
      </div>
    </div>
  );
}
