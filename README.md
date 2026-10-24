# Zina's Days: free setup

Everything here is free: **Vercel** hosts the app (free Hobby plan), and **Google Gemini** checks new foods (free tier, no credit card).

## 1. Get a free Gemini API key (once)

1. Go to **aistudio.google.com/apikey** and sign in with a Google account.
2. Click **Create API key** and copy it. Keep it private.
   - Don't add a billing account. Without one, the key stays on the free tier and can never charge you.

## 2. Put the files on GitHub

1. On github.com, create a new repository called `zinas-days` (public or private both work).
2. Upload **all** the files and the **api** folder from this zip, keeping the same layout:
   ```
   index.html
   manifest.webmanifest
   sw.js
   icon-192.png, icon-512.png, icon-maskable-512.png
   api/check-food.js
   ```
   (GitHub Desktop is easiest: copy the folder into the repository and push.)

## 3. Deploy on Vercel (free)

1. On vercel.com, sign in with GitHub. Click **Add New → Project** and import `zinas-days`.
2. Leave **Framework Preset** as **Other**.
3. Open **Environment Variables** and add:
   - Name: `GEMINI_API_KEY`
   - Value: your key from step 1
4. Click **Deploy**. You get a link like **https://zinas-days.vercel.app**.

If you add or change the key later, open **Deployments** and click **Redeploy** so it takes effect.

## 4. Install on her Android phone

1. Open the Vercel link in **Chrome** on her phone.
2. Tap **⋮ → Install app** (or **Add to Home screen**).
3. The Zina's Days icon appears on her home screen.

## How the food check works

- About 200 Algerian and everyday foods are built in and work **offline**. This includes English, French, Arabic and Darija spellings, and dishes made from them.
- A food that isn't in the list is checked **online** by Gemini. The answer is saved on her phone, so each new food is only checked once.
- The free tier allows a few hundred checks a day, which is far more than one person needs. If the limit is ever reached, new foods show "Couldn't check" until the next day.
- Without internet, a new food shows "Couldn't check. Check your internet." It gets checked again next time she edits the food list while online.
- Only food names are sent to Google, never her symptoms or log. On the free tier, Google may use what's sent to improve its services.

## Good to know

- Her log stays **on her phone only**. Uninstalling the app or clearing Chrome's site data deletes it.
- **Updating the app:** replace `index.html`, change `zinas-days-v1` to `zinas-days-v2` in `sw.js`, and push. Vercel redeploys automatically.
- **If Google renames its models:** the server tries several model names automatically. You can also set a `GEMINI_MODEL` environment variable in Vercel to a current model name from aistudio.google.com.
