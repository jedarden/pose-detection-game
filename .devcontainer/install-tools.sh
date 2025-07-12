#!/bin/bash

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to try installing a package
try_install() {
    local package="$1"
    local install_cmd="$2"
    
    echo "Attempting to install $package..."
    
    # Try without sudo first
    if $install_cmd 2>/dev/null; then
        echo "$package installed successfully without sudo"
        return 0
    fi
    
    # Try with sudo if available
    if command_exists sudo; then
        echo "Retrying with sudo..."
        if sudo $install_cmd 2>/dev/null; then
            echo "$package installed successfully with sudo"
            return 0
        fi
    fi
    
    echo "Failed to install $package - continuing without it"
    return 1
}

# Install tmux
if ! command_exists tmux; then
    if command_exists apt-get; then
        try_install "tmux" "apt-get install -y tmux"
    elif command_exists yum; then
        try_install "tmux" "yum install -y tmux"
    elif command_exists apk; then
        try_install "tmux" "apk add tmux"
    elif command_exists brew; then
        try_install "tmux" "brew install tmux"
    else
        echo "No supported package manager found for tmux installation"
    fi
else
    echo "tmux is already installed"
fi

# Install GitHub CLI
if ! command_exists gh; then
    if command_exists apt-get; then
        # For Debian/Ubuntu systems
        echo "Installing GitHub CLI for Debian/Ubuntu..."
        INSTALL_GH_DEB="(type -p wget >/dev/null || apt-get install wget -y) && \
            wget -qO- https://cli.github.com/packages/githubcli-archive-keyring.gpg | tee /usr/share/keyrings/githubcli-archive-keyring.gpg > /dev/null && \
            chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg && \
            echo 'deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main' | tee /etc/apt/sources.list.d/github-cli.list > /dev/null && \
            apt-get update && \
            apt-get install gh -y"
        
        # Try without sudo first
        if bash -c "$INSTALL_GH_DEB" 2>/dev/null; then
            echo "GitHub CLI installed successfully without sudo"
        elif command_exists sudo; then
            echo "Retrying GitHub CLI installation with sudo..."
            if sudo bash -c "$INSTALL_GH_DEB" 2>/dev/null; then
                echo "GitHub CLI installed successfully with sudo"
            else
                echo "Failed to install GitHub CLI - continuing without it"
            fi
        else
            echo "Failed to install GitHub CLI - continuing without it"
        fi
    elif command_exists yum; then
        try_install "gh" "yum install -y gh"
    elif command_exists brew; then
        try_install "gh" "brew install gh"
    else
        echo "No supported package manager found for GitHub CLI installation"
    fi
else
    echo "GitHub CLI is already installed"
fi

# Install claude-code
if ! command_exists claude-code; then
    echo "Installing claude-code..."
    
    # Download and install claude-code
    INSTALL_CMD="curl -fsSL https://raw.githubusercontent.com/anthropics/claude-code/main/install.sh | sh"
    
    # Try without sudo first
    if eval "$INSTALL_CMD" 2>/dev/null; then
        echo "claude-code installed successfully"
    else
        # Try with sudo if available
        if command_exists sudo; then
            echo "Retrying claude-code installation with sudo..."
            if sudo sh -c "$INSTALL_CMD" 2>/dev/null; then
                echo "claude-code installed successfully with sudo"
            else
                echo "Failed to install claude-code - continuing without it"
            fi
        else
            echo "Failed to install claude-code - continuing without it"
        fi
    fi
else
    echo "claude-code is already installed"
fi

echo "Tool installation script completed"