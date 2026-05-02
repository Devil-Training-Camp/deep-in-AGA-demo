import React, { useState, useEffect } from 'react'

// 这个组件故意有若干问题，用于演示 code-reviewer 能发现什么
// 问题：any 类型泛滥、缺少 Props 接口、useEffect 依赖不完整、组件职责过多

export function UserList() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<any>(null)
  const [filter, setFilter] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [sortField, setSortField] = useState('name')
  const [sortOrder, setSortOrder] = useState('asc')

  useEffect(() => {
    setLoading(true)
    fetch(`/api/users?page=${page}&size=${pageSize}&filter=${filter}&sort=${sortField}&order=${sortOrder}`)
      .then(res => res.json())
      .then(data => {
        setUsers(data.users)
        setLoading(false)
      })
      .catch(err => {
        setError(err)
        setLoading(false)
      })
  }, [page, filter]) // 缺少 sortField, sortOrder 依赖

  const handleDelete = async (id: any) => {
    await fetch(`/api/users/${id}`, { method: 'DELETE' })
    setUsers(users.filter((u: any) => u.id !== id))
  }

  const handleUpdate = async (id: any, data: any) => {
    const res = await fetch(`/api/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const updated = await res.json()
    setUsers(users.map((u: any) => (u.id === id ? updated : u)))
  }

  const exportCSV = () => {
    const csv = users.map((u: any) => `${u.name},${u.email}`).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'users.csv'
    a.click()
  }

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <div>
      <div>
        <input
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="搜索用户..."
        />
        <select value={sortField} onChange={e => setSortField(e.target.value)}>
          <option value="name">按姓名</option>
          <option value="email">按邮箱</option>
          <option value="createdAt">按注册时间</option>
        </select>
        <button onClick={() => setSortOrder(o => (o === 'asc' ? 'desc' : 'asc'))}>
          {sortOrder === 'asc' ? '↑' : '↓'}
        </button>
        <button onClick={exportCSV}>导出 CSV</button>
      </div>
      <ul>
        {users.map((user: any) => (
          <li key={user.id}>
            {user.name} — {user.email}
            <button onClick={() => handleDelete(user.id)}>删除</button>
            <button onClick={() => handleUpdate(user.id, { name: user.name })}>更新</button>
          </li>
        ))}
      </ul>
      <div>
        <button onClick={() => setPage(p => p - 1)} disabled={page === 1}>
          上一页
        </button>
        <span>第 {page} 页</span>
        <button onClick={() => setPage(p => p + 1)}>下一页</button>
      </div>
    </div>
  )
}
