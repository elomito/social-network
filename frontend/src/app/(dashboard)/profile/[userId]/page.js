'use client'

import { useEffect, useState } from 'react'

export default function Page({ params }) {
  const userId = params?.userId
  const [data, setData] = useState(null)

  useEffect(() => {
    if (!userId) return
    fetch(`/api/users?id=${userId}`, { credentials: 'include' })
      .then((res) => res.json())
      .then(setData)
      .catch(() => setData(null))
  }, [userId])

  return <pre className="p-4">{JSON.stringify(data, null, 2)}</pre>
}
