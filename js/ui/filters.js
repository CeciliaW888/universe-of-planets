export function buildFilterChips({ container, key, values, state, onChange }) {
  values.forEach((value) => {
    const button = document.createElement("button");
    button.className = `chip${value === "All" ? " active" : ""}`;
    button.dataset.value = value;
    button.addEventListener("click", () => {
      state.filters[key] = value;
      onChange();
    });
    container.appendChild(button);
  });
}
