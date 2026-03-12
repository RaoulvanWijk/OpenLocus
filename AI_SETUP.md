# AI Chat — Setup & Build Requirements

The AI chat feature runs a local LLM (Llama 3.2 3B) directly inside the app via the Tauri Rust backend. No internet connection or external service is needed at runtime, but the build has extra requirements compared to the base app.

---

## Additional build dependencies

### 1. LLVM / Clang (Windows only)

The `llama-cpp-2` Rust crate uses `bindgen` to generate C++ bindings at compile time. `bindgen` requires LLVM to be installed.

**Install via winget (recommended):**
```bash
winget install LLVM.LLVM
```

After installation, set the environment variable (restart your terminal after):
```powershell
[System.Environment]::SetEnvironmentVariable("LIBCLANG_PATH", "C:\Program Files\LLVM\bin", "User")
```

**Alternative — Visual Studio Installer:**
Open the VS Installer → Modify → Individual Components → search "Clang" → check **C++ Clang tools for Windows**.

macOS and Linux already ship with Clang and do not need this step.

---

### 2. CMake

`llama-cpp-2` also requires CMake to compile the underlying llama.cpp C++ library.

```bash
# Windows (winget)
winget install Kitware.CMake

# macOS (Homebrew)
brew install cmake

# Ubuntu/Debian
sudo apt install cmake
```

---

## First build

The first `cargo build` after adding `llama-cpp-2` compiles llama.cpp from source. This takes **5–15 minutes** depending on your machine. Subsequent builds are fast (only Rust code recompiles).

```bash
pnpm -F desktop tauri dev
```

---

## AI model download

The LLM model is **not** bundled in the installer. It is downloaded on first launch from inside the app.

- **Model:** Llama 3.2 3B Instruct Q4_K_M (bartowski quantization)
- **Size:** ~2 GB
- **Stored at:** `%APPDATA%\com.openlocus.desktop\models\` (Windows)
- **Download is resumable** — if it fails partway, re-clicking the button continues from where it left off.

The app shows a progress bar during download and loads the model automatically once complete. All subsequent launches load from the local cache instantly.

---

## Deleting the model

To force a fresh download (e.g. to switch models), delete the model file:

```bash
# Windows
rm "$env:APPDATA\com.openlocus.desktop\models\ministral-3b-q4_k_m.gguf"

# macOS
rm ~/Library/Application\ Support/com.openlocus.desktop/models/ministral-3b-q4_k_m.gguf
```

---

## New Rust dependencies added

| Crate | Purpose |
|---|---|
| `llama-cpp-2` | Rust bindings to llama.cpp for local LLM inference |
| `encoding_rs` | UTF-8 decoding of token byte sequences |
| `reqwest` (stream + rustls-tls) | HTTP download of the model file with streaming progress |
| `futures-util` | Async stream utilities for the download |
| `tokio` (full) | Async runtime for download and Tauri commands |

---

## Full setup from scratch (new machine)

```bash
# 1. Install base Tauri prerequisites
# https://tauri.app/start/prerequisites/

# 2. Install LLVM (Windows only)
winget install LLVM.LLVM
# Set LIBCLANG_PATH as shown above, restart terminal

# 3. Install CMake
winget install Kitware.CMake   # Windows
brew install cmake              # macOS

# 4. Clone and install JS dependencies
git clone https://github.com/RaoulvanWijk/OpenLocus.git
cd OpenLocus
pnpm install

# 5. Start dev (first run compiles llama.cpp — takes ~10 min)
pnpm -F desktop tauri dev

# 6. In the app: click "Download AI model" and wait for ~2 GB download
```
