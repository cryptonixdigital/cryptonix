import { auth, db } from "./firebase.js";
import { get, ref } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

auth.onAuthStateChanged(async (user) => {
  if (!user) return;

  const snapshot = await get(ref(db, `users/${user.uid}`));
  if (snapshot.exists()) {
    const data = snapshot.val();
    const walletUID = data.uid;

    // Show QR Code
    new QRCode(document.getElementById("walletQr"), {
      text: walletUID,
      width: 150,
      height: 150,
      colorDark: "#fff",
      colorLight: "#000",
    });

    // Show UID and Copy Function
    document.getElementById("walletAddress").textContent = walletUID;
    document.getElementById("copyButton").addEventListener("click", () => {
      navigator.clipboard.writeText(walletUID).then(() => {
        alert("Wallet UID copied!");
      });
    });
  }
});