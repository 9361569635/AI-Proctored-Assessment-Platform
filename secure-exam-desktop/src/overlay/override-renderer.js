window.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("code");
  const err = document.getElementById("err");
  const submit = document.getElementById("submit");
  const cancel = document.getElementById("cancel");

  function trySubmit() {
    window.overrideBridge.submit(input.value || "");
  }

  submit.addEventListener("click", trySubmit);
  cancel.addEventListener("click", () => window.overrideBridge.cancel());
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") trySubmit();
    if (e.key === "Escape") window.overrideBridge.cancel();
  });

  window.overrideBridge.onResult((ok) => {
    if (!ok) {
      err.textContent = "Incorrect code.";
      input.value = "";
      input.focus();
    }
  });
});
