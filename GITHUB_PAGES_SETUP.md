# Setting Up GitHub Pages

To make this website accessible remotely via GitHub Pages, follow these steps:

1. Go to the GitHub repository at https://github.com/pdarleyjr/IP

2. Click on "Settings" (tab with gear icon)

3. In the left sidebar, click on "Pages" (under "Code and automation" section)

4. Under "Source", select "Deploy from a branch"

5. Under "Branch", select "master" and "/ (root)" folder, then click "Save"

6. Wait a few minutes for GitHub to build and deploy your site

7. Once deployed, your site will be available at: https://pdarleyjr.github.io/IP/

## Troubleshooting

- If images are not loading, make sure the paths in the HTML files are correct
- If you see a 404 error, ensure that the repository is public and that GitHub Pages is properly configured
- If you need to make changes, simply push updates to the master branch and GitHub Pages will automatically rebuild the site

## Files Required for GitHub Pages

The following files have been included in the repository to ensure proper GitHub Pages functionality:

- `.nojekyll` - Tells GitHub Pages not to use Jekyll processing
- `index.html` - The main entry point for the website
- All necessary CSS, JavaScript, and image files