import axios from "axios";

const deezer = axios.create({
  baseURL: "https://api.deezer.com",
  timeout: 5000,
});

deezer.interceptors.response.use((res) => {
  if (res.data?.error) {
    throw new Error(res.data.error.message);
  }
  return res;
});
