import React, { useState, useEffect } from 'react'

// 这个组件故意写得有问题，用于演示 readonly-review 能发现什么
// 问题：使用了 any 类型，缺少 Props 接口，组件职责过多

export function UserList() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<any>(null)
  const [filter, setFilter] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/users?page=${page}&size=${pageSize}&filter=${filter}`)
      .then(res => res.json())
      .then(data => {
        setUsers(data.users)
        setLoading(false)
      })
      .catch(err => {
        setError(err)
        setLoading(false)
      })
  }, [page, filter])

  const handleDelete = async (id: any) => {
    await fetch(`/api/users/${id}`, { method: 'DELETE' })
    setUsers(users.filter((u: any) => u.id !== id))
  }

  const handleUpdate = async (id: any, data: any) => {
    const res = await fetch(`/api/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
    const updated = await res.json()
    setUsers(users.map((u: any) => u.id === id ? updated : u))
  }

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <div>
      <input
        value={filter}
        onChange={e => setFilter(e.target.value)}
        placeholder="搜索用户..."
      />
      <ul>
        {users.map((user: any) => (
          <li key={user.id}>
            {user.name} - {user.email}
            <button onClick={() => handleDelete(user.id)}>删除</button>
          </li>
        ))}
      </ul>
      <button onClick={() => setPage(p => p - 1)} disabled={page === 1}>上一页</button>
      <button onClick={() => setPage(p => p + 1)}>下一页</button>
    </div>
  )
}
