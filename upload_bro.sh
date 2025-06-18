#!/bin/bash

# Menambahkan semua perubahan
git add .

# Meminta pesan commit
read -p "Masukkan pesan commit: " commit_message

# Commit perubahan
git commit -m "$commit_message"

# Push ke remote repository (GitHub)
git push origin main

# Deploy ke Firebase
firebase deploy

echo "Proses selesai! Perubahan sudah di-push dan terdeploy ke Firebase."
