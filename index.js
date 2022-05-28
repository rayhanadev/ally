import express from 'express';
const app = express();

import Client from '@replit/database';
const db = new Client();

import slugify from '@sindresorhus/slugify';
import { customAlphabet } from 'nanoid';
const nanoid = customAlphabet('6789BCDFGHJKLMNPQRTWbcdfghjkmnpqrtwz', 10);

import cors from 'cors';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import morgan from 'morgan';

import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Add your Replit username, and those with whom you'd like to share
// to provide access to your dashboard. Use an empty array to allow
// open access to everyone.
const WHITELISTED_USERS = ['RayhanADev'];

import 'dotenv/config';
const dev = process.env.NODE_ENV !== 'production';

const isAllowed = (req) => {
	if (WHITELISTED_USERS.length === 0) return true;
	else if (WHITELISTED_USERS.includes(req.headers['x-replit-user-name']))
		return true;
	return false;
};

app.use(express.static('assets'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan('tiny'));

if (!dev) {
	app.use(cors());
	app.use(compression());
}

app.get('/', (req, res) => {
	if (isAllowed(req)) return res.status(307).redirect('/~');
	return res.status(200).sendFile('./views/index.html', { root: __dirname });
});

app.get('/auth', (req, res) => {
	res.status(200).sendFile('./views/auth.html', { root: __dirname });
});

app.get('/~', (req, res) => {
	if (!isAllowed(req)) return res.status(307).redirect('/auth');
	return res
		.status(200)
		.sendFile('./views/dashboard.html', { root: __dirname });
});

app.post('/api', async (req, res) => {
	if (!isAllowed(req)) {
		return res.status(403).send({
			status: 403,
			message: 'You are not logged in.',
		});
	}

	try {
		if (!req.body.url) {
			return res.status(400).send({
				status: 400,
				message: 'No url parameter.',
			});
		} else {
			const url = req.body.url;
			const path = req.body.path;

			if (path && (await db.get(slugify(path)))) {
				return res.status(409).send({
					status: 409,
					message: 'Resource already exists at given location.',
				});
			}

			let redirect = '';

			if (path) redirect = slugify(path);
			else redirect = nanoid();

			await db.set(redirect, url);

			return res.status(200).send({
				status: 200,
				message: 'Url has been created.',
				data: {
					url: '/' + redirect,
				},
			});
		}
	} catch (err) {
		return res.status(500).send(err);
	}
});

app.get('*', async (req, res) => {
	try {
		const redirect = await db.get(req.url.substring(1));
		if (redirect && redirect.length > 0) {
			res.redirect(redirect);
		} else {
			res.status(404).sendFile('./views/404.html', { root: __dirname });
		}
	} catch (error) {
		console.log(error);
		res.status(500).sendFile('./views/500.html', { root: __dirname });
	}
});

app.listen(3000, () => {
	console.log('Application running on Port:', 3000);
});
