function shimmer(id) { 
  const el = document.getElementById(id);
  if (!el) return;

  el.classList.remove("media-update");
  void el.offsetWidth;
  el.classList.add("media-update");
}

function setMediaText(id, text, shouldShimmer = false) {
  const el = document.getElementById(id);
  if (!el) return;

  if (el.innerText !== text) {
    el.innerText = text;

    if (shouldShimmer) {
      shimmer(id);
    }
  } else {
    el.innerText = text;
  }
}

async function updateMedia() {
  try {
    const res = await fetch("/media-status?nocache=" + Date.now());
    if (!res.ok) throw new Error("Failed to fetch media");

    const data = await res.json();

    /* BOOK */
    if (data.book && data.book.title) {
      const author = data.book.author ? " — " + data.book.author : "";
      setMediaText("reading", data.book.title + author, true);
    } else {
      setMediaText("reading", "—");
    }

    /* WATCHING */
    if (data.watching && data.watching.title) {
      const detail = data.watching.detail ? " — " + data.watching.detail : "";
      setMediaText("watching", data.watching.title + detail, true);
    } else {
      setMediaText("watching", "—");
    }

  } catch (err) {
    console.error("Media update failed:", err);
    setMediaText("reading", "—");
    setMediaText("watching", "—");
  }
}

updateMedia();
setInterval(updateMedia, 10000);