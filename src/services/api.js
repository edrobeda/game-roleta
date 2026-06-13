import axios from 'axios'

const TOKEN = import.meta.env.VITE_API_TOKEN

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    ...(TOKEN && {
        headers: { Authorization: `Basic ${btoa(`:${TOKEN}`)}` },
    }),
})

export default api
