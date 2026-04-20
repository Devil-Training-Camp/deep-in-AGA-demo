import React from 'react'

interface CardProps {
  title: string
  description: string
  imageUrl?: string
  onClick?: () => void
}

export function Card({ title, description, imageUrl, onClick }: CardProps) {
  return (
    <div className="card" onClick={onClick}>
      {imageUrl && <img src={imageUrl} alt={title} />}
      <div className="card-body">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  )
}
