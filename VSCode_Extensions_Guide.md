# VS Code Extensions for DurgaShaktifoils E-commerce Development

## Essential Extensions (Install These)

### 1. **ESLint** (`dbaeumer.vscode-eslint`)
- Lints JavaScript/React code
- Shows errors in real-time
- Auto-fixes on save

### 2. **Prettier** (`esbenp.prettier-vscode`)
- Code formatter
- Keeps code consistent
- Auto-formats on save

### 3. **Tailwind CSS IntelliSense** (`bradlc.vscode-tailwindcss`)
- Autocomplete for Tailwind classes
- Shows color previews
- Essential for this project

### 4. **ES7+ React/Redux Snippets** (`dsznajder.es7-react-js-snippets`)
- Quick React component creation
- Shortcuts: `rafce`, `rfc`, `useState`

### 5. **Python** (`ms-python.python`)
- Python language support
- Debugging
- IntelliSense for FastAPI

### 6. **Pylance** (`ms-python.vscode-pylance`)
- Fast Python language server
- Better autocomplete
- Type checking

### 7. **Path Intellisense** (`christian-kohler.path-intellisense`)
- Autocomplete file paths
- Import suggestions

### 8. **Auto Rename Tag** (`formulahendry.auto-rename-tag`)
- Auto-rename paired HTML/JSX tags

### 9. **Color Highlight** (`naumovs.color-highlight`)
- Highlights colors in code
- Useful for CSS/styling

### 10. **Live Server** (`ritwickdey.liveserver`)
- Quick HTML preview
- Auto-reload

### 11. **MongoDB for VS Code** (`mongodb.mongodb-vscode`)
- View MongoDB databases
- Run queries directly
- Browse collections

### 12. **REST Client** (`humao.rest-client`)
- Test API endpoints
- No need for Postman
- See examples below

## Installation

### Method 1: Install All at Once
1. Open VS Code
2. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
3. Type "Extensions: Show Recommended Extensions"
4. Click "Install All"

### Method 2: Manual Installation
1. Press `Ctrl+Shift+X` to open Extensions
2. Search for each extension name
3. Click "Install"

## VS Code Settings

Create `.vscode/settings.json` in your project:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "tailwindCSS.experimental.classRegex": [
    ["clsx\\(([^)]*)\\)", "(?:'|\"|`)([^']*)(?:'|\"|`)"]
  ],
  "python.linting.enabled": true,
  "python.linting.pylintEnabled": false,
  "python.linting.flake8Enabled": true,
  "[python]": {
    "editor.defaultFormatter": "ms-python.python",
    "editor.formatOnSave": true
  },
  "[javascript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[javascriptreact]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

## Useful VS Code Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+P` | Quick file open |
| `Ctrl+Shift+P` | Command palette |
| `Ctrl+`` | Toggle terminal |
| `Alt+Shift+F` | Format document |
| `Ctrl+D` | Select next occurrence |
| `Ctrl+/` | Toggle comment |
| `Ctrl+B` | Toggle sidebar |
| `F2` | Rename symbol |

## REST Client Examples

Create `api-tests.http` file:

```http
### Get all products
GET http://localhost:8001/api/products

### Register user
POST http://localhost:8001/api/auth/register
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "password123",
  "full_name": "Test User",
  "phone": "9876543210"
}

### Login
POST http://localhost:8001/api/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "password123"
}

### Get cart (requires token)
GET http://localhost:8001/api/cart
Authorization: Bearer your_token_here

### Add to cart
POST http://localhost:8001/api/cart/add
Content-Type: application/json
Authorization: Bearer your_token_here

{
  "product_id": "product_id_here",
  "quantity": 1
}
```

## MongoDB Extension Usage

1. Click MongoDB icon in sidebar
2. Click "Add Connection"
3. Enter: `mongodb://localhost:27017`
4. Browse `durgashaktifoils_db` database
5. View collections: users, products, orders, carts

## React Snippets Cheatsheet

| Snippet | Creates |
|---------|---------|
| `rafce` | Arrow function component with export |
| `rfc` | Function component |
| `useState` | useState hook |
| `useEffect` | useEffect hook |
| `useContext` | useContext hook |

Example:
```javascript
// Type 'rafce' and press Tab
import React from 'react'

const ComponentName = () => {
  return (
    <div>ComponentName</div>
  )
}

export default ComponentName
```

## Additional Useful Extensions (Optional)

- **GitLens** - Git supercharged
- **Error Lens** - Inline error display
- **Import Cost** - Show package size
- **Code Spell Checker** - Catch typos
- **TODO Highlight** - Highlight TODOs
- **Better Comments** - Colorful comments

## Troubleshooting

### Prettier Not Working?
1. Check you have `.prettierrc` file
2. Verify Prettier is set as default formatter
3. Restart VS Code

### ESLint Not Working?
1. Run `yarn install` in frontend folder
2. Restart ESLint server: `Ctrl+Shift+P` > "ESLint: Restart ESLint Server"

### Tailwind Autocomplete Not Working?
1. Ensure `tailwind.config.js` exists
2. Reload window: `Ctrl+Shift+P` > "Developer: Reload Window"
