const ws = new WebSocket('ws://localhost:8080/');
		
		const el_status = document.getElementById("data_status");
		
		const el_pos_x = document.getElementById("pos_x");
		const el_pos_y = document.getElementById("pos_y");
		const el_pos_z = document.getElementById("pos_z");

		const el_rot_x = document.getElementById("rot_x");
		const el_rot_y = document.getElementById("rot_y");
		const el_rot_z = document.getElementById("rot_z");

		const el_tip_x = document.getElementById("tip_x");
		const el_tip_y = document.getElementById("tip_y");
		const el_tip_z = document.getElementById("tip_z");

		// Create a canvas element in your HTML file
		const canvas = document.createElement('canvas');
		canvas.width = 500; // Set canvas width
		canvas.height = 500; // Set canvas height
		document.body.appendChild(canvas);
		const ctx = canvas.getContext('2d');

		function drawCrosshair(pos_x, pos_y) {
			const centerX = canvas.width / 2;
			const centerY = canvas.height / 2;
			const pos_px_x = -pos_x * 1000;
			const pos_px_y = -(pos_y + 1) * 1000;

			// Clear the canvas
			ctx.clearRect(0, 0, canvas.width, canvas.height);

			// Draw horizontal line
			ctx.beginPath();
			ctx.moveTo(0, centerY + pos_px_y);
			ctx.lineTo(canvas.width, centerY + pos_px_y);
			ctx.strokeStyle = 'black';
			ctx.lineWidth = 2;
			ctx.stroke();

			// Draw vertical line
			ctx.beginPath();
			ctx.moveTo(centerX + pos_px_x, 0);
			ctx.lineTo(centerX + pos_px_x, canvas.height);
			ctx.strokeStyle = 'black';
			ctx.lineWidth = 2;
			ctx.stroke();
		}

		ws.onmessage = function(event) {       
			try {
				const jsObject = JSON.parse(event.data);
			
				for (let i = 0; i < jsObject.length; i++) {
					const tracker = jsObject[i];

					el_pos_x.textContent = tracker.p[0].toFixed(3);
					el_pos_y.textContent = tracker.p[1].toFixed(3);
					el_pos_z.textContent = tracker.p[2].toFixed(3);

					el_rot_x.textContent = tracker.r[0].toFixed(3);
					el_rot_y.textContent = tracker.r[1].toFixed(3);
					el_rot_z.textContent = tracker.r[2].toFixed(3);

					el_tip_x.textContent = tracker.t[0].toFixed(3);
					el_tip_y.textContent = tracker.t[1].toFixed(3);
					el_tip_z.textContent = tracker.t[2].toFixed(3);

					drawCrosshair(tracker.t[0], tracker.t[2]);
				}

				el_status.textContent = "receiving";
			} catch (error) {
				console.error(error);
				el_status.textContent = "no data";
			}
			
		};