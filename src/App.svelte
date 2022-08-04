<script lang="ts">
	import Typewriter from 'svelte-typewriter';
	import image from './assets/image.jpg';
	import Footer from './components/Footer.svelte';
</script>

<main>
	<div>
		<img src={image} class="logo" alt="Svelte Logo" />
		<Typewriter mode="scramble" scrambleDuration={700} scrambleSlowdown={true}>
			<h1>Shahriar Shojib</h1>
		</Typewriter>
	</div>
	<p>◕ ◡ ◕ っ Hi, I’m Shahriar! from Dhaka,Bangladesh passionate about technology and open source.</p>
	<Typewriter mode="scramble" scrambleDuration={700} scrambleSlowdown={true}>
		<p>
			(┬┬﹏┬┬) I am currently building <a target="_blank" href="https://tixio.io">Tixio</a>
		</p>
	</Typewriter>

	<Typewriter mode="scramble" scrambleDuration={700} scrambleSlowdown={true}>
		<p>
			(👉ﾟヮﾟ)👉 previously built <a target="_blank" href="https://zaynaxhealth.com">Zaynax Health</a> &
			<a target="_blank" href="https://zdrop.com.bd">zDrop</a>
		</p>
	</Typewriter>

	<p>(❁´◡`❁) currently researching kubernetes, local first software, Distributed systems and monorepos</p>

	<Typewriter mode="scramble" scrambleDuration={700} scrambleSlowdown={true}>
		<p>
			(～￣▽￣)～ made <a href="https://github.com/poly-state/poly-state" target="_blank">Poly State</a>,
			<a href="https://github.com/shahriar-shojib/atenv" target="_blank">@Env</a> open source
		</p>
	</Typewriter>

	<h2>Present</h2>
	<p>Principal Software Engineer @ Tixio.io</p>
	<h2>Previously</h2>
	<p>Senior Software Engineer (Team Lead) @ Zaynax Limited</p>
	<h2>Tools and Technologies I use</h2>
	<p>
		Node.js, MongoDB, Typescript, Nestjs, React, Jest, Go, Rust, Google Cloud, AWS, Github & Github Actions, Docker, NX,
		SWC, Vite, Actix Web, Fiber
	</p>
</main>
<Footer />

<style>
	:root {
		--start-color: #7928ca;
		--end-color: #ff0080;
	}
	div {
		display: flex;
		align-items: center;
	}

	.logo {
		height: 4em;
		will-change: filter;
		border-radius: 100%;
		margin-right: 20px;
		transition: all 0.2s ease-in-out;
	}

	.logo:hover {
		filter: drop-shadow(0 0 2em #417f2dcd);
	}

	h1 {
		background-clip: text;
		-webkit-background-clip: text;
		background-image: linear-gradient(90deg, var(--start-color), var(--end-color));
		color: transparent;
		user-select: none;
	}
</style>
