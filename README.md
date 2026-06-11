# Dylan's World 🌍

A GitHub Pages site powered by automated deployment.

## 🚀 Features

- **Automatic Deployment**: Changes to `main` branch automatically deploy to GitHub Pages
- **GitHub Actions**: Uses GitHub Actions for CI/CD pipeline
- **Responsive Design**: Mobile-friendly and modern UI

## 📋 How It Works

1. Code is pushed to the `main` branch
2. GitHub Actions workflow triggers automatically
3. Website is built and deployed to GitHub Pages
4. Live at: https://dylan2045ad.github.io/dylansworld

## 📁 Project Structure

```
.
├── index.html                 # Main website
├── .github/workflows/
│   └── deploy.yml            # Deployment workflow
└── README.md                 # This file
```

## 🔧 Deployment

The site is automatically deployed on every push to the `main` branch via the GitHub Actions workflow defined in `.github/workflows/deploy.yml`.

To manually trigger deployment:
1. Go to the "Actions" tab in your repository
2. Select "Deploy to GitHub Pages"
3. Click "Run workflow"

## 📖 Learn More

- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

---

**Last deployed**: Check the Actions tab for deployment history
