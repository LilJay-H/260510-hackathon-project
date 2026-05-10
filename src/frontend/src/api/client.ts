const BASE = '/api'

async function fetchAPI(path: string, options?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  return res.json()
}

export const api = {
  uploadTextbook: async (file: File) => {
    const form = new FormData()
    form.append('file', file)
    const res = await fetch(`${BASE}/textbooks/upload`, { method: 'POST', body: form })
    return res.json()
  },
  listTextbooks: () => fetchAPI('/textbooks/list'),
  extractKnowledge: (id: string) => fetchAPI(`/knowledge/extract/${id}`, { method: 'POST' }),
  getGraph: (id: string) => fetchAPI(`/knowledge/graph/${id}`),
  getAllGraphs: () => fetchAPI('/knowledge/all'),
  mergeGraphs: () => fetchAPI('/integration/merge', { method: 'POST' }),
  getMerged: () => fetchAPI('/integration/merged'),
  getDecisions: () => fetchAPI('/integration/decisions'),
  ragQuery: (question: string) => fetchAPI('/rag/query', { method: 'POST', body: JSON.stringify({ question }) }),
  chatSend: (message: string) => fetchAPI('/chat/send', { method: 'POST', body: JSON.stringify({ message }) }),
  chatHistory: () => fetchAPI('/chat/history'),
}
