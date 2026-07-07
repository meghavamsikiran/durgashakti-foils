const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Credentials
const ADMIN_EMAIL = 'durgashaktifoils@gmail.com';
const ADMIN_PASSWORD = '123456';
const CUSTOMER_EMAIL = 'meghavamsikiran@gmail.com';
const CUSTOMER_PASSWORD = '12345678';

const BASE_URL = 'https://durgashakti-foils.vercel.app';

// Categories of pages to test
const publicPages = [
    { name: 'homepage', url: `${BASE_URL}/` },
    { name: 'shop', url: `${BASE_URL}/shop` },
    { name: 'cart', url: `${BASE_URL}/cart` },
    { name: 'about', url: `${BASE_URL}/about` },
    { name: 'contact', url: `${BASE_URL}/contact` },
    { name: 'policies', url: `${BASE_URL}/policies` }
];

const customerPages = [
    { name: 'customer-dashboard-orders', url: `${BASE_URL}/dashboard/orders` },
    { name: 'customer-dashboard-transactions', url: `${BASE_URL}/dashboard/transactions` },
    { name: 'customer-dashboard-wishlist', url: `${BASE_URL}/dashboard/wishlist` },
    { name: 'customer-dashboard-addresses', url: `${BASE_URL}/dashboard/addresses` },
    { name: 'customer-dashboard-settings', url: `${BASE_URL}/dashboard/settings` },
    { name: 'customer-dashboard-tickets', url: `${BASE_URL}/dashboard/tickets` }
];

const adminPages = [
    { name: 'admin-dashboard', url: `${BASE_URL}/admin/dashboard` },
    { name: 'admin-products', url: `${BASE_URL}/admin/products` },
    { name: 'admin-categories', url: `${BASE_URL}/admin/categories` },
    { name: 'admin-stock', url: `${BASE_URL}/admin/stock` },
    { name: 'admin-orders', url: `${BASE_URL}/admin/orders` },
    { name: 'admin-customers', url: `${BASE_URL}/admin/customers` },
    { name: 'admin-payments', url: `${BASE_URL}/admin/payments` },
    { name: 'admin-analytics', url: `${BASE_URL}/admin/analytics` },
    { name: 'admin-gstr1', url: `${BASE_URL}/admin/gstr1` },
    { name: 'admin-settings', url: `${BASE_URL}/admin/settings` },
    { name: 'admin-profile', url: `${BASE_URL}/admin/profile` },
    { name: 'admin-audit-logs', url: `${BASE_URL}/admin/audit-logs` },
    { name: 'admin-my-account', url: `${BASE_URL}/admin/my-account` }
];

async function runLighthouse(url, outputPath) {
    try {
        console.log(`Running Lighthouse audit on: ${url}`);
        // Preset desktop configuration overrides the default mobile throttling simulation
        execSync(`npx -y lighthouse ${url} --preset=desktop --chrome-flags="--headless --no-sandbox" --output=json --output-path=${outputPath} --only-categories=performance,accessibility,best-practices,seo --quiet`);
        console.log(`Saved report to ${outputPath}`);
        return true;
    } catch (err) {
        console.error(`Failed to audit ${url}:`, err.message);
        return false;
    }
}

async function loginAndGetToken(email, password) {
    const uniqueTempDir = path.join(process.env.TEMP || '/tmp', `puppeteer_token_grab_${Date.now()}`);
    const browser = await puppeteer.launch({
        headless: true,
        userDataDir: uniqueTempDir,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
        
        await page.waitForSelector('#email');
        await page.waitForSelector('#password');
        
        await page.type('#email', email);
        await page.type('#password', password);
        
        await page.click('button[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
        await new Promise(r => setTimeout(r, 3000));
        
        // Grab token and themeMode from localStorage
        const localStorageData = await page.evaluate(() => {
            return {
                token: localStorage.getItem('token'),
                themeMode: localStorage.getItem('themeMode') || 'dark',
                user: localStorage.getItem('user')
            };
        });
        
        return localStorageData;
    } finally {
        await browser.close();
        try {
            if (fs.existsSync(uniqueTempDir)) {
                fs.rmSync(uniqueTempDir, { recursive: true, force: true });
            }
        } catch (cleanupErr) {}
    }
}

async function runAuditWithToken(url, reportPath, authData) {
    try {
        console.log(`Running Lighthouse audit on: ${url}`);
        
        const headers = {
            "Authorization": `Bearer ${authData.token}`
        };
        const headersStr = JSON.stringify(headers).replace(/"/g, '\\"');
        
        execSync(`npx -y lighthouse ${url} --preset=desktop --chrome-flags="--headless --no-sandbox" --extra-headers="${headersStr}" --output=json --output-path=${reportPath} --only-categories=performance,accessibility,best-practices,seo --quiet`);
        console.log(`Saved report to ${reportPath}`);
    } catch (err) {
        console.error(`Failed to audit ${url}:`, err.message);
    }
}

async function main() {
    console.log("Starting Webapp Entire Auditing Suite (DESKTOP MODE)...");
    
    // Clear old JSON reports to force audit in desktop preset mode
    const files = fs.readdirSync('./');
    for (const file of files) {
        if (file.startsWith('lighthouse-') && file.endsWith('.json')) {
            fs.unlinkSync(path.join('./', file));
        }
    }
    
    // 1. Audit Public Pages First
    console.log("\n--- AUDITING PUBLIC PAGES ---");
    for (const p of publicPages) {
        const reportPath = `./lighthouse-${p.name}.json`;
        await runLighthouse(p.url, reportPath);
    }

    // Grab Customer Auth Token
    let customerAuth = null;
    try {
        customerAuth = await loginAndGetToken(CUSTOMER_EMAIL, CUSTOMER_PASSWORD);
        console.log("Acquired Customer Auth Token successfully.");
    } catch (err) {
        console.error("Failed to acquire Customer Auth Token:", err.message);
    }

    // 2. Audit Customer Protected Pages
    if (customerAuth) {
        console.log("\n--- AUDITING CUSTOMER PAGES ---");
        for (const p of customerPages) {
            const reportPath = `./lighthouse-${p.name}.json`;
            await runAuditWithToken(p.url, reportPath, customerAuth);
        }
    }

    // Grab Admin Auth Token
    let adminAuth = null;
    try {
        adminAuth = await loginAndGetToken(ADMIN_EMAIL, ADMIN_PASSWORD);
        console.log("Acquired Admin Auth Token successfully.");
    } catch (err) {
        console.error("Failed to acquire Admin Auth Token:", err.message);
    }

    // 3. Audit Admin Protected Pages
    if (adminAuth) {
        console.log("\n--- AUDITING ADMIN PAGES ---");
        for (const p of adminPages) {
            const reportPath = `./lighthouse-${p.name}.json`;
            await runAuditWithToken(p.url, reportPath, adminAuth);
        }
    }
    
    console.log("\nAll page audits completed! Compiling results...");
    compileReport();
}

function compileReport() {
    const pages = [
        ...publicPages,
        ...customerPages,
        ...adminPages
    ];
    
    let markdownTable = "| Page | Performance | Accessibility | Best Practices | SEO |\n| :--- | :---: | :---: | :---: | :---: |\n";
    
    for (const p of pages) {
        const reportPath = `./lighthouse-${p.name}.json`;
        if (fs.existsSync(reportPath)) {
            try {
                const data = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
                const perf = Math.round(data.categories.performance.score * 100);
                const acc = Math.round(data.categories.accessibility.score * 100);
                const best = Math.round(data.categories['best-practices'].score * 100);
                const seo = Math.round(data.categories.seo.score * 100);
                
                const fmtPerf = perf < 50 ? `${perf} 🔴` : (perf < 90 ? `${perf} 🟡` : `${perf} 🟢`);
                const fmtAcc = acc < 50 ? `${acc} 🔴` : (acc < 90 ? `${acc} 🟡` : `${acc} 🟢`);
                const fmtBest = best < 50 ? `${best} 🔴` : (best < 90 ? `${best} 🟡` : `${best} 🟢`);
                const fmtSeo = seo < 50 ? `${seo} 🔴` : (seo < 90 ? `${seo} 🟡` : `${seo} 🟢`);
                
                markdownTable += `| **${p.name}** | ${fmtPerf} | ${fmtAcc} | ${fmtBest} | ${fmtSeo} |\n`;
            } catch (e) {
                markdownTable += `| **${p.name}** | Error | Error | Error | Error |\n`;
            }
        } else {
            markdownTable += `| **${p.name}** | N/A | N/A | N/A | N/A |\n`;
        }
    }
    
    fs.writeFileSync('./lighthouse-final-report.md', `# Lighthouse Full Webapp Audit Summary (DESKTOP MODE)\n\n${markdownTable}`);
    console.log("Compiled final summary report to ./lighthouse-final-report.md");
}

main().catch(console.error);
