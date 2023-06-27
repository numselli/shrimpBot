const s = new WebSocket(`${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws`);

s.onerror = console.log
s.onmessage = e => {
  const n = Number(e.data).toLocaleString()
  document.title = `${n} Shrimps`
  document.getElementById("count").innerText = n
};