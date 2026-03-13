#!/usr/bin/env python3
"""
Git Repository Review & Pull Script
Purpose: 에이전트가 한눈에 프로젝트 상황을 파악할 수 있도록
- 심볼릭링크 원본 경로 표시
- 마지막 커밋 정보
- Git 상태 (clean/dirty, ahead/behind)
- Pull 시도 및 결과
"""

import subprocess
import sys
from pathlib import Path
from datetime import datetime
from typing import List, Tuple, Optional

# ANSI Color codes
class Colors:
    RED = '\033[0;31m'
    GREEN = '\033[0;32m'
    YELLOW = '\033[1;33m'
    BLUE = '\033[0;34m'
    NC = '\033[0m'  # No Color

class GitRepoInfo:
    def __init__(self, path: Path):
        self.path = path
        self.name = path.name
        self.is_symlink = path.is_symlink()
        self.symlink_target = path.resolve() if self.is_symlink else None
        self.error = None

    def run_git(self, *args, check=False) -> Tuple[bool, str]:
        """Run git command and return (success, output)"""
        try:
            result = subprocess.run(
                ['git', '-C', str(self.get_git_dir())] + list(args),
                capture_output=True,
                text=True,
                check=check,
                timeout=30
            )
            return (result.returncode == 0, result.stdout.strip())
        except subprocess.TimeoutExpired:
            return (False, "Command timeout")
        except Exception as e:
            return (False, str(e))

    def get_git_dir(self) -> Path:
        """Get the actual git directory (follows symlinks)"""
        return self.symlink_target if self.is_symlink else self.path

    def has_git(self) -> bool:
        """Check if directory has .git"""
        return (self.get_git_dir() / '.git').exists()

    def get_branch(self) -> str:
        """Get current branch name"""
        success, output = self.run_git('rev-parse', '--abbrev-ref', 'HEAD')
        return output if success else 'unknown'

    def is_dirty(self) -> Tuple[bool, int]:
        """Check if working directory is dirty and return number of modified files"""
        success, _ = self.run_git('diff-index', '--quiet', 'HEAD', '--')
        if not success:  # has changes
            _, output = self.run_git('status', '--short')
            return (True, len(output.split('\n')) if output else 0)
        return (False, 0)

    def get_last_commit(self) -> dict:
        """Get last commit information"""
        _, date = self.run_git('log', '-1', '--format=%ci')
        _, msg = self.run_git('log', '-1', '--format=%s')
        _, author = self.run_git('log', '-1', '--format=%an')
        _, hash_short = self.run_git('log', '-1', '--format=%h')

        return {
            'date': date.split()[0] if date else 'N/A',
            'message': msg or 'N/A',
            'author': author or 'N/A',
            'hash': hash_short or 'N/A'
        }

    def fetch_and_check_remote(self, branch: str) -> dict:
        """Fetch from remote and check ahead/behind status"""
        result = {
            'success': False,
            'status': 'unknown',
            'ahead': 0,
            'behind': 0,
            'pull_attempted': False,
            'pull_success': False
        }

        # Fetch from remote
        success, _ = self.run_git('fetch', 'origin', branch)
        if not success:
            result['status'] = 'fetch_failed'
            return result

        result['success'] = True

        # Get local and remote hashes
        success_local, local_hash = self.run_git('rev-parse', 'HEAD')
        success_remote, remote_hash = self.run_git('rev-parse', f'origin/{branch}')

        if not success_remote:
            result['status'] = 'no_remote_tracking'
            return result

        if local_hash == remote_hash:
            result['status'] = 'up_to_date'
            return result

        # Check ahead/behind
        _, ahead = self.run_git('rev-list', '--count', f'origin/{branch}..HEAD')
        _, behind = self.run_git('rev-list', '--count', f'HEAD..origin/{branch}')

        result['ahead'] = int(ahead) if ahead.isdigit() else 0
        result['behind'] = int(behind) if behind.isdigit() else 0

        if result['ahead'] > 0 and result['behind'] > 0:
            result['status'] = 'diverged'
        elif result['ahead'] > 0:
            result['status'] = 'ahead'
        elif result['behind'] > 0:
            result['status'] = 'behind'
            # Try to pull
            result['pull_attempted'] = True
            success, _ = self.run_git('pull', 'origin', branch)
            result['pull_success'] = success

        return result

def print_header(target_dir: Path):
    """Print script header"""
    now = datetime.now().strftime('%Y-%m-%d %H:%M:%S KST')
    print("=== Git Repository Review & Pull ===")
    print(f"Date: {now}")
    print(f"Target: {target_dir}")
    print()
    print("━" * 60)
    print()

def print_repo_info(repo: GitRepoInfo):
    """Print repository information"""
    # Repository name
    symlink_info = f" → {repo.symlink_target}" if repo.is_symlink else ""
    print(f"{Colors.BLUE}[{repo.name}]{Colors.NC}{symlink_info}")

    # Branch
    branch = repo.get_branch()
    print(f"  Branch: {Colors.BLUE}{branch}{Colors.NC}")

    # Status (clean/dirty)
    dirty, modified_count = repo.is_dirty()
    if dirty:
        print(f"  Status: {Colors.YELLOW}⚠ Dirty ({modified_count} files modified){Colors.NC}")
    else:
        print(f"  Status: {Colors.GREEN}✓ Clean{Colors.NC}")

    # Last commit
    commit = repo.get_last_commit()
    print(f"  Last Commit: {commit['date']} ({commit['hash']})")
    print(f"    \"{commit['message']}\" - {commit['author']}")

    # Remote status
    print("  Remote: ", end='')
    remote_info = repo.fetch_and_check_remote(branch)

    if not remote_info['success']:
        print(f"{Colors.YELLOW}⚠ Fetch failed{Colors.NC}")
        return dirty, remote_info

    status = remote_info['status']
    if status == 'up_to_date':
        print(f"{Colors.GREEN}✓ Up-to-date{Colors.NC}")
    elif status == 'no_remote_tracking':
        print(f"{Colors.YELLOW}No remote tracking{Colors.NC}")
    elif status == 'diverged':
        print(f"{Colors.YELLOW}⚠ Diverged (ahead {remote_info['ahead']}, behind {remote_info['behind']}){Colors.NC}")
    elif status == 'ahead':
        print(f"{Colors.YELLOW}↑ Ahead {remote_info['ahead']} commits{Colors.NC}")
    elif status == 'behind':
        print(f"{Colors.YELLOW}↓ Behind {remote_info['behind']} commits{Colors.NC}")
        if remote_info['pull_attempted']:
            if remote_info['pull_success']:
                print(f"  Pull: {Colors.GREEN}✓ Success{Colors.NC}")
            else:
                print(f"  Pull: {Colors.RED}✗ Failed{Colors.NC}")

    print()
    return dirty, remote_info

def print_summary(stats: dict, attention_items: List[str], error_items: List[str]):
    """Print summary statistics"""
    print("━" * 60)
    print()
    print("=== Summary ===")
    print(f"Total repositories: {stats['total']}")
    print(f"{Colors.GREEN}✓ Updated: {stats['updated']}{Colors.NC}")
    print(f"{Colors.BLUE}→ Already up-to-date: {stats['uptodate']}{Colors.NC}")
    print(f"{Colors.YELLOW}⚠ With uncommitted changes: {stats['with_changes']}{Colors.NC}")
    print(f"{Colors.RED}✗ Errors: {stats['errors']}{Colors.NC}")
    print()

    if attention_items:
        print("=== Attention Required ===")
        for item in attention_items:
            print(f"{Colors.YELLOW}⚠{Colors.NC} {item}")
        print()

    if error_items:
        print("=== Errors ===")
        for item in error_items:
            print(f"{Colors.RED}✗{Colors.NC} {item}")
        print()

def main():
    if len(sys.argv) < 2:
        print(f"Usage: {sys.argv[0]} <directory>", file=sys.stderr)
        sys.exit(1)

    target_dir = Path(sys.argv[1]).resolve()

    if not target_dir.is_dir():
        print(f"{Colors.RED}{target_dir} is not a valid directory{Colors.NC}", file=sys.stderr)
        sys.exit(1)

    print_header(target_dir)

    # Statistics
    stats = {
        'total': 0,
        'updated': 0,
        'uptodate': 0,
        'with_changes': 0,
        'errors': 0
    }

    attention_items = []
    error_items = []

    # Process each subdirectory
    for item in sorted(target_dir.iterdir()):
        if not item.is_dir():
            continue

        repo = GitRepoInfo(item)

        if not repo.has_git():
            continue

        stats['total'] += 1

        try:
            dirty, remote_info = print_repo_info(repo)

            if dirty:
                stats['with_changes'] += 1
                modified_count = repo.is_dirty()[1]
                attention_items.append(f"{repo.name}: {modified_count} uncommitted changes")

            if remote_info['success']:
                if remote_info['status'] == 'up_to_date':
                    stats['uptodate'] += 1
                elif remote_info['pull_attempted']:
                    if remote_info['pull_success']:
                        stats['updated'] += 1
                        attention_items.append(f"{repo.name}: pulled {remote_info['behind']} commits")
                    else:
                        stats['errors'] += 1
                        error_items.append(f"{repo.name}: pull failed")

        except Exception as e:
            print(f"  {Colors.RED}✗ Error: {str(e)}{Colors.NC}")
            print()
            stats['errors'] += 1
            error_items.append(f"{repo.name}: {str(e)}")

    print_summary(stats, attention_items, error_items)

if __name__ == '__main__':
    main()
