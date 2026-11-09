# GitHub Pages Setup Guide

Follow these simple steps to deploy Pipe Runner to GitHub Pages.

---

## ✅ Method 1: Automatic (Recommended)

### Step 1: Enable GitHub Pages

1. Go to your repository on GitHub:
   **https://github.com/jibes/plumber-game/settings/pages**

2. Under "Source", select **"GitHub Actions"**

3. Click **Save**

That's it! The workflow will automatically deploy on the next push to `main`.

### Step 2: Trigger Deployment

The workflow runs automatically on push to `main`. To trigger it manually:

1. Go to **Actions** tab in your repository
2. Select the **"Deploy to GitHub Pages"** workflow
3. Click **"Run workflow"** dropdown
4. Click **"Run workflow"** button

### Step 3: Access Your Game

Once deployed, your game will be available at:
```
https://jibes.github.io/plumber-game/
```

---

## ✅ Method 2: Manual (If Automatic Fails)

### Step 1: Build Locally

```bash
cd game
npm install
npm run build:web
```

### Step 2: Create gh-pages Branch

```bash
cd game/build/web
git init
git add .
git commit -m "Deploy Pipe Runner to GitHub Pages"
git branch -M gh-pages
git remote add origin https://github.com/jibes/plumber-game.git
git push -u origin gh-pages -f
```

### Step 3: Enable GitHub Pages

1. Go to **Settings > Pages**
2. Under "Source", select **"Deploy from a branch"**
3. Select **"gh-pages"** branch and **"/ (root)"** folder
4. Click **Save**

### Step 4: Access Your Game

Your game will be live at:
```
https://jibes.github.io/plumber-game/
```

---

## 📋 What the Workflow Does

The `.github/workflows/deploy.yml` file automates:

1. **Checkout** - Gets your code
2. **Setup Node.js** - Installs Node.js 20
3. **Install Dependencies** - Installs npm packages
4. **Build Web Version** - Creates production build in `game/build/web/`
5. **Upload Artifact** - Uploads build as GitHub Pages artifact
6. **Deploy** - Deploys to GitHub Pages

---

## 🔍 Checking Deployment Status

### View Workflow Runs

1. Go to your repository
2. Click on the **Actions** tab
3. Select **"Deploy to GitHub Pages"** workflow
4. View the latest run status

### Check GitHub Pages Settings

1. Go to **Settings > Pages**
2. View the deployment status
3. Check the URL

---

## ⚠️ Troubleshooting

### Issue: Workflow Not Running

**Solution:**
- Check that the workflow file exists at `.github/workflows/deploy.yml`
- Ensure you've pushed the workflow file to `main` branch
- Check GitHub Actions permissions in repository settings

### Issue: Build Fails

**Solution:**
- Check the workflow run logs in Actions tab
- Ensure Node.js is properly set up
- Verify `game/package.json` has correct dependencies

### Issue: 404 Page Not Found

**Solution:**
- Wait 1-2 minutes after deployment completes
- Verify GitHub Pages source is set to "GitHub Actions"
- Check the URL: `https://jibes.github.io/plumber-game/`

### Issue: Blank Screen

**Solution:**
- Open browser console (F12) to check for errors
- Ensure internet connection (Phaser loads from CDN)
- Try refreshing the page

---

## 📊 Workflow Details

### Triggers

The workflow runs on:
- **Push to main branch** (when `game/` or workflow files change)
- **Manual trigger** (via GitHub Actions UI)

### Permissions Required

The workflow needs:
- `contents: read` - To checkout repository
- `pages: write` - To deploy to GitHub Pages
- `id-token: write` - For authentication

### Build Process

```bash
# What the workflow does:
cd game
npm ci
npm run build:web
# Uploads game/build/web/ to GitHub Pages
```

---

## 🎯 Custom Domain (Optional)

To use a custom domain:

1. Buy a domain (e.g., from Namecheap, Google Domains)
2. Go to **Settings > Pages**
3. Enter your custom domain in the "Custom domain" field
4. Configure DNS with your domain provider:
   - Add a CNAME record pointing to `jibes.github.io`
   - Or add A records for GitHub Pages IPs

---

## 📝 Notes

- GitHub Pages deployments can take 1-2 minutes to become live
- The first deployment may take longer
- All subsequent pushes to `main` will automatically deploy
- The workflow only runs when `game/` or workflow files change

---

## 🚀 Quick Checklist

- [ ] Workflow file exists at `.github/workflows/deploy.yml`
- [ ] Workflow file is pushed to `main` branch
- [ ] GitHub Pages source is set to "GitHub Actions"
- [ ] Workflow has completed successfully (check Actions tab)
- [ ] Game is accessible at `https://jibes.github.io/plumber-game/`

---

## 🙏 Need Help?

If you encounter any issues:

1. Check the workflow logs in the **Actions** tab
2. Verify the workflow file exists and is correct
3. Ensure GitHub Pages is enabled with "GitHub Actions" source
4. Open an issue: [https://github.com/jibes/plumber-game/issues](https://github.com/jibes/plumber-game/issues)

---

**Once set up, your game will automatically deploy on every push to main!** 🎮
