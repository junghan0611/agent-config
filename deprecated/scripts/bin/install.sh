#!/usr/bin/env bash
# Install GLG Toolbox to ~/.local/bin
# Usage: ./install.sh

set -uo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
info() { echo -e "${BLUE}ℹ ${NC}$1"; }
success() { echo -e "${GREEN}✓${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC} $1"; }
error() { echo -e "${RED}✗${NC} $1"; }

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALL_DIR="$HOME/.local/bin"

# Check if install directory exists
if [[ ! -d "$INSTALL_DIR" ]]; then
    warn "$INSTALL_DIR does not exist. Creating..."
    mkdir -p "$INSTALL_DIR"
    success "Created $INSTALL_DIR"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}GLG Toolbox Installer${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
info "Source: $SCRIPT_DIR"
info "Target: $INSTALL_DIR"
echo ""

# Counter
installed=0
updated=0
skipped=0

# Find all executable files (excluding this script and hidden files)
while IFS= read -r file; do
    filename=$(basename "$file")

    # Skip install.sh itself
    if [[ "$filename" == "install.sh" ]]; then
        continue
    fi

    target="$INSTALL_DIR/$filename"

    # Check if symlink already exists
    if [[ -L "$target" ]]; then
        current_link=$(readlink "$target")
        if [[ "$current_link" == "$file" ]]; then
            info "Already installed: $filename"
            ((skipped++))
        else
            ln -sf "$file" "$target"
            success "Updated: $filename"
            ((updated++))
        fi
    elif [[ -e "$target" ]]; then
        warn "File exists (not a symlink): $target"
        read -p "Overwrite? (y/N): " confirm
        if [[ "$confirm" =~ ^[Yy]$ ]]; then
            rm "$target"
            ln -s "$file" "$target"
            success "Installed: $filename (overwrote existing)"
            ((installed++))
        else
            info "Skipped: $filename"
            ((skipped++))
        fi
    else
        ln -s "$file" "$target"
        success "Installed: $filename"
        ((installed++))
    fi
done < <(find "$SCRIPT_DIR" -maxdepth 1 -type f -executable)

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "=== Installation Summary ==="
echo -e "${GREEN}✓ Installed: $installed${NC}"
echo -e "${BLUE}↻ Updated: $updated${NC}"
echo -e "${YELLOW}○ Skipped: $skipped${NC}"
echo ""

# Check if ~/.local/bin is in PATH
if [[ ":$PATH:" != *":$INSTALL_DIR:"* ]]; then
    warn "$INSTALL_DIR is not in your PATH"
    echo ""
    echo "Add the following to your ~/.bashrc or ~/.zshrc:"
    echo ""
    echo -e "  ${BLUE}export PATH=\"\$HOME/.local/bin:\$PATH\"${NC}"
    echo ""
fi

success "Installation complete!"
echo ""
