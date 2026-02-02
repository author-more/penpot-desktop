sudo apt-get install --no-install-recommends flatpak

flatpak remote-add --user --if-not-exists flathub https://dl.flathub.org/repo/flathub.flatpakrepo
flatpak install flathub -y org.flatpak.Builder
