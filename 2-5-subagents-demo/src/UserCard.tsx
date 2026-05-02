import React from 'react'

interface User {
  id: string
  name: string
  email: string
  avatarUrl?: string
  role: 'admin' | 'member' | 'viewer'
}

interface UserCardProps {
  user: User
  onDelete?: (id: string) => void
}

export function UserCard({ user, onDelete }: UserCardProps) {
  return (
    <div className="user-card">
      {user.avatarUrl && <img src={user.avatarUrl} alt={user.name} />}
      <div className="user-info">
        <h3>{user.name}</h3>
        <p>{user.email}</p>
        <span className={`role role-${user.role}`}>{user.role}</span>
      </div>
      {onDelete && (
        <button onClick={() => onDelete(user.id)}>删除</button>
      )}
    </div>
  )
}
