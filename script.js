// if ("serial" in navigator) {
//     class BrailleModel {
//         constructor() {
//             this.model = null;
//             this.initialized = false;
//         }
    
//         async initialize() {
//             this.model = tf.sequential({
//                 layers: [
//                     tf.layers.dense({units: 8, activation: 'relu', inputShape: [4]}),
//                     tf.layers.dense({units: 16, activation: 'relu'}),
//                     tf.layers.dense({units: 8, activation: 'softmax'})
//                 ]
//             });
            
//             this.model.compile({
//                 optimizer: 'adam',
//                 loss: 'categoricalCrossentropy',
//                 metrics: ['accuracy']
//             });
            
//             this.initialized = true;
//             console.log('Model initialized');
//         }
    
//         async predict(userMetrics) {
//             if (!this.initialized) return null;
            
//             const input = tf.tensor2d([
//                 [
//                     userMetrics.accuracy,
//                     userMetrics.competency,
//                     userMetrics.avgLatency,
//                     userMetrics.errorPattern
//                 ]
//             ]);
            
//             const prediction = this.model.predict(input);
//             return prediction.dataSync();
//         }
    
//         async train(data) {
//             const xs = tf.tensor2d(data.map(d => d.input));
//             const ys = tf.tensor2d(data.map(d => d.output));
            
//             await this.model.fit(xs, ys, {
//                 epochs: 50,
//                 batchSize: 8,
//                 shuffle: true
//             });
//         }
//     }
//     class BrailleTeacher {
//         constructor() {
//             this.port = null;
//             this.introDone = false;
//             this.reader = null;
//             this.mode = "learning";
//             this.currentLetterIndex = 0;
//             this.correctInputs = 0;
//             this.totalInputs = 0;
//             this.progressChart = null;
//             this.recognition = null;
//             this.isListening = false;
//             this.speechQueue = [];
//             this.isSpeaking = false;
//             this.alphabet = "abcdefghijklmnopqrstuvwxyz".split("");
//             this.words = ["bat", "cat", "moon", "star", "tree", "bee", "sun", "ice"];
//             this.currentWordIndex = 0;
//             this.currentWordLetterIndex = 0;
//             this.alphabetFolds = {
//                 "a": "1", "b": "1 and 2", "c": "1 and 4", "d": "1, 4, and 5",
//                 "e": "1 and 5", "f": "1, 2 and 4", "g": "1, 2, 4, and 5",
//                 "h": "1, 2, and 5", "i": "2 and 4", "j": "2, 4, and 5",
//                 "k": "1 and 3", "l": "1, 2, and 3", "m": "1, 3, and 4",
//                 "n": "1, 3, 4, and 5", "o": "1, 3, and 5", "p": "1, 2, 3, and 4",
//                 "q": "1, 2, 3, 4, and 5", "r": "1, 2, 3, and 5", "s": "2, 3, and 4",
//                 "t": "2, 3, 4, and 5", "u": "1, 3, and 6", "v": "1, 2, 3, and 6",
//                 "w": "2, 4, 5, and 6", "x": "1, 3, 4, and 6", 
//                 "y": "1, 3, 4, 5, and 6", "z": "1, 3, 5, and 6"
//             };
//             this.initializeEventListeners();
//             this.initProgressChart();
//             this.initializeSpeechRecognition();
//             this.brailleModel = new BrailleModel();
//             this.trainingData = [];
//             this.userHistory = [];
//             this.errorPattern = Array(6).fill(0); // Track errors per Braille dot
//             this.brailleModel.initialize();
//         }

//         initializeSpeechRecognition() {
//             if ('webkitSpeechRecognition' in window) {
//                 this.recognition = new webkitSpeechRecognition();
//                 this.recognition.continuous = true;
//                 this.recognition.interimResults = false;
//                 this.recognition.lang = 'en-US';
//                 this.recognition.onresult = (event) => {
//                     const last = event.results.length - 1;
//                     const command = event.results[last][0].transcript.trim().toLowerCase();
//                     if (command.includes("learning mode") || command.includes("learning")) {
//                         this.switchMode("learning");
//                         // this.speak("Switching to learning mode");
//                     } else if (command.includes("practice mode") || command.includes("practice")) {
//                         this.switchMode("practice");
//                         // this.speak("Switching to practice mode");
//                     }
//                 };
//                 this.recognition.onerror = (event) => {
//                     console.error('Speech recognition error:', event.error);
//                     this.showStatus(`Speech recognition error: ${event.error}`);
//                 };
//                 this.recognition.onend = () => {
//                     if (this.isListening) this.recognition.start();
//                 };
//             }
//         }

//         startListening() {
//             if (this.recognition && !this.isListening) {
//                 this.isListening = true;
//                 this.recognition.start();
//                 this.showStatus("Voice commands activated");
//                 this.speak("Voice commands are now active.");
//             }
//         }

//         stopListening() {
//             if (this.recognition && this.isListening) {
//                 this.isListening = false;
//                 this.recognition.stop();
//                 this.showStatus("Voice commands deactivated");
//             }
//         }



//         switchMode(newMode) {
//             this.mode = newMode;
//             document.getElementById("modeSelect").value = newMode;
//             this.resetState();
//             if (this.mode === "learning") {
//                 // Modified speak message to include fold mapping
//                 this.speak(`Switching to learning mode. Let's start with letter ${this.alphabet[0].toUpperCase()}. Fold ${this.alphabetFolds[this.alphabet[0]]} for ${this.alphabet[0].toUpperCase()}.`);
//             } else if (this.mode === "practice") {
//                 this.speak("Switching to practice mode.");
//                 setTimeout(() => this.announceCurrentWord(), 1000);
//             }
//         }

//         async connectToSerial() {
//             try {
//                 this.port = await navigator.serial.requestPort();
//                 await this.port.open({ baudRate: 9600 });
//                 const decoder = new TextDecoderStream();
//                 this.port.readable.pipeTo(decoder.writable);
//                 this.reader = decoder.readable.getReader();

//                 if (!this.introDone) {
//                     await this.playIntroduction();
//                     this.introDone = true;
//                 }

//                 this.showStatus("Connected successfully!");
//                 // this.speak("Connected successfully!");
//                 this.readSerialData();
//                 this.startListening();
//             } catch (error) {
//                 this.showStatus(`Connection failed: ${error.message}`);
//             }
//         }
// // newww introduction fucntion 
//         async playIntroduction() {
//             const writer = this.port.writable.getWriter();
//             const fingers = [
//                 {num: 1, desc: "left ring finger"},
//                 {num: 2, desc: "left middle finger"},
//                 {num: 3, desc: "left index finger"},
//                 {num: 4, desc: "right index finger"},
//                 {num: 5, desc: "right middle finger"},
//                 {num: 6, desc: "right ring finger"}
//             ];
    
//             this.speak("The finger mappings are",1800);
            
//             for (const finger of fingers) {
//                 await new Promise(resolve => setTimeout(resolve, 500));
//                 await writer.write(new TextEncoder().encode(finger.num.toString()));
//                 this.speak(`${finger.num} is your ${finger.desc}`);
//                 await new Promise(resolve => setTimeout(resolve, 1500));
//             }
            
//             await writer.write(new TextEncoder().encode('X'));
//             writer.releaseLock();
//             // this.speak("Voice commands are now active.");
//         }
            

//         async readSerialData() {
//             try {
//                 while (true) {
//                     const { value, done } = await this.reader.read();
//                     if (done) break;
//                     if (value) this.handleBrailleInput(value.trim());
//                 }
//             } catch (error) {
//                 this.showStatus(`Error reading data: ${error.message}`);
//             }
//         }

//         handleBrailleInput(data) {
//             if (!data) return;
//             let outputText = "";
//             try {
//                 if (this.mode === "learning") {
//                     outputText = this.handleLearningMode(data);
//                 } else {
//                     outputText = this.handlePracticeMode(data);
//                 }
//                 this.updateDisplay(outputText);
//             } catch (error) {
//                 this.showStatus(`Error processing input: ${error.message}`);
//             }
//         }

//         // handleLearningMode(data) {
//         //     const currentLetter = this.alphabet[this.currentLetterIndex];
//         //     if (data.toLowerCase() === currentLetter) {
//         //         this.speak(`Correct! Now try ${this.alphabet[this.currentLetterIndex + 1] || 'practice mode'}.`);
//         //         this.correctInputs++;
//         //         this.currentLetterIndex++;
//         //         if (this.currentLetterIndex < this.alphabet.length) {
//         //             const nextLetter = this.alphabet[this.currentLetterIndex];
//         //             this.speak(`Fold ${this.alphabetFolds[nextLetter]} for ${nextLetter.toUpperCase()}.`);
//         //         }
//         //     } else {
//         //         this.speak(`Incorrect. Fold ${this.alphabetFolds[currentLetter]} for ${currentLetter.toUpperCase()}.`);
//         //     }
//         //     this.totalInputs++;
//         //     this.updateProgressChart();
//         //     return currentLetter.toUpperCase();
//         // }

//         // async handleLearningMode(data) {
//         //     const currentLetter = this.alphabet[this.currentLetterIndex];
//         //     if (data.toLowerCase() === currentLetter) {
//         //         this.speak(`It is Correct!`);
//         //         this.correctInputs++;
//         //         this.currentLetterIndex++;
//         //         if (this.currentLetterIndex < this.alphabet.length) {
//         //             const nextLetter = this.alphabet[this.currentLetterIndex];
//         //             // Added clear instruction for next letter
//         //             this.speak(`Now try ${nextLetter.toUpperCase()}. Fold ${this.alphabetFolds[nextLetter]}.`);
//         //         } else {
//         //             this.speak("Completed alphabet! Switching to practice mode.");
//         //             this.switchMode("practice");
//         //         }
//         //     } else {
//         //         // Added clear correction instruction
//         //         this.speak(`  It is Incorrect. Please fold ${this.alphabetFolds[currentLetter]} for ${currentLetter.toUpperCase()}.`);
//         //         const dots = this.alphabetFolds[currentLetter].match(/\d/g);
//         //         dots.forEach(d => this.errorPattern[parseInt(d)-1]++);
//         //     }
//         //     this.totalInputs++;
//         //     this.updateProgressChart();
//         //     const metrics = this.collectMetrics();
//         //     this.userHistory.push(metrics);
//         //     return currentLetter.toUpperCase();
            
//         //     // Store in localStorage
//         //     localStorage.setItem('brailleData', JSON.stringify(this.userHistory));
            
        
//         // }

//         // collectMetrics() {
//         //     return {
//         //         accuracy: this.correctInputs / this.totalInputs,
//         //         competency: this.calculateCompetency(),
//         //         latency: this.calculateLatency(),
//         //         errorPattern: [...this.errorPattern],
//         //         timestamp: Date.now()
//         //     };
//         // }

//         handleLearningMode(data) {
//                         const currentLetter = this.alphabet[this.currentLetterIndex];
//                         if (data.toLowerCase() === currentLetter) {
//                             this.speak(`It is Correct!`);
//                             this.correctInputs++;
//                             this.currentLetterIndex++;
//                             if (this.currentLetterIndex < this.alphabet.length) {
//                                 const nextLetter = this.alphabet[this.currentLetterIndex];
//                                 this.speak(`Now try ${nextLetter.toUpperCase()}. Fold ${this.alphabetFolds[nextLetter]}.`);
//                             } else {
//                                 this.speak("Completed alphabet! Switching to practice mode.");
//                                 this.switchMode("practice");
//                             }
//                         } else {
//                             this.speak(`It is Incorrect. Please fold ${this.alphabetFolds[currentLetter]} for ${currentLetter.toUpperCase()}.`);
//                             const dots = this.alphabetFolds[currentLetter].match(/\d/g);
//                             dots.forEach(d => this.errorPattern[parseInt(d) - 1]++);
//                         }
//                         this.totalInputs++;
//                         this.updateProgressChart();
//                         return currentLetter.toUpperCase();
//                     }

//         handlePracticeMode(data) {
//             const currentWord = this.words[this.currentWordIndex];
//             const currentLetter = currentWord[this.currentWordLetterIndex];
//             if (data.toLowerCase() === currentLetter) {
//                 this.speak(currentLetter.toUpperCase());
//                 this.currentWordLetterIndex++;
//                 this.correctInputs++;
//                 if (this.currentWordLetterIndex === currentWord.length) {
//                     this.speak(`Excellent! Completed ${currentWord.toUpperCase()}`);
//                     this.currentWordIndex = (this.currentWordIndex + 1) % this.words.length;
//                     this.currentWordLetterIndex = 0;
//                     setTimeout(() => this.announceCurrentWord(), 2000);
//                 }
//             } else {
//                 this.speak(`Incorrect, try again.`);
//                 this.currentWordLetterIndex = 0;
//                 setTimeout(() => this.announceCurrentWord(), 2000);
//             }
//             this.totalInputs++;
//             this.updateProgressChart();
//             return currentWord.substring(0, this.currentWordLetterIndex).toUpperCase();
//         }

//         announceCurrentWord() {
//             const currentWord = this.words[this.currentWordIndex];
//             const letters = currentWord.toUpperCase().split('');
//             this.speak(`Practice word: ${currentWord.toUpperCase()}`);
//             letters.forEach((letter, index) => {
//                 setTimeout(() => {
//                     this.speak(letter);
//                     if (index === letters.length - 1) {
//                         setTimeout(() => {
//                             this.speak(`Start with ${this.alphabetFolds[currentWord[0]]} for ${currentWord[0].toUpperCase()}`);
//                         }, 1000);
//                     }
//                 }, (index + 1) * 1000);
//             });
//         }

//         speak(text) {
//             if (!text) return;
//             const utterance = new SpeechSynthesisUtterance(text);
//             utterance.rate = 0.9;
//             window.speechSynthesis.speak(utterance);
//         }

//         initProgressChart() {
//             const ctx = document.getElementById('progressChart').getContext('2d');
//             this.progressChart = new Chart(ctx, {
//                 type: 'line',
//                 data: {
//                     labels: [],
//                     datasets: [{
//                         label: 'Accuracy (%)',
//                         data: [],
//                         backgroundColor: 'rgba(75, 192, 192, 0.2)',
//                         borderColor: 'rgba(75, 192, 192, 1)',
//                         borderWidth: 1,
//                         tension: 0.4
//                     }]
//                 },
//                 options: {
//                     responsive: true,
//                     scales: {
//                         y: { beginAtZero: true, max: 100 },
//                         x: { title: { display: true, text: 'Attempts' } }
//                     }
//                 }
//             });
//         }

//         updateProgressChart() {
//             if (this.totalInputs > 0) {
//                 const accuracy = (this.correctInputs / this.totalInputs) * 100;
//                 if (this.progressChart.data.labels.length > 20) {
//                     this.progressChart.data.labels.shift();
//                     this.progressChart.data.datasets[0].data.shift();
//                 }
//                 this.progressChart.data.labels.push(this.totalInputs.toString());
//                 this.progressChart.data.datasets[0].data.push(accuracy.toFixed(2));
//                 this.progressChart.update();
//             }
//         }

//         updateDisplay(text) {
//             const display = document.getElementById("brailleOutput");
//             if (display) display.textContent = text;
//         }

//         showStatus(message) {
//             const status = document.getElementById("statusMessage");
//             if (status) {
//                 status.textContent = message;
//                 setTimeout(() => status.textContent = "", 3000);
//             }
//         }

//         resetState() {
//             this.currentLetterIndex = 0;
//             this.correctInputs = 0;
//             this.totalInputs = 0;
//             this.currentWordIndex = 0;
//             this.currentWordLetterIndex = 0;
//             this.progressChart.data.labels = [];
//             this.progressChart.data.datasets[0].data = [];
//             this.progressChart.update();
//             this.updateDisplay("");
//         }

//         initializeEventListeners() {
//             document.getElementById("connectBtn").addEventListener("click", () => this.connectToSerial());
//             document.getElementById("modeSelect").addEventListener("change", (event) => {
//                 this.switchMode(event.target.value);
//             });
//         }
//     }

//     new BrailleTeacher();
// } else {
//     alert("Web Serial API not supported. Use Chrome or Edge.");
// }

if ("serial" in navigator) {
    class BrailleModel {
        constructor() {
            this.model = null;
            this.initialized = false;
        }

        async initialize() {
            this.model = tf.sequential({
                layers: [
                    tf.layers.dense({ units: 8, activation: 'relu', inputShape: [4] }),
                    tf.layers.dense({ units: 16, activation: 'relu' }),
                    tf.layers.dense({ units: 8, activation: 'softmax' })
                ]
            });

            this.model.compile({
                optimizer: 'adam',
                loss: 'categoricalCrossentropy',
                metrics: ['accuracy']
            });

            this.initialized = true;
            console.log('Model initialized');
        }

        async predict(userMetrics) {
            if (!this.initialized) return null;

            const input = tf.tensor2d([
                [
                    userMetrics.accuracy,
                    userMetrics.competency,
                    userMetrics.avgLatency,
                    userMetrics.errorPattern
                ]
            ]);

            const prediction = this.model.predict(input);
            return prediction.dataSync();
        }

        async train(data) {
            const xs = tf.tensor2d(data.map(d => d.input));
            const ys = tf.tensor2d(data.map(d => d.output));

            await this.model.fit(xs, ys, {
                epochs: 50,
                batchSize: 8,
                shuffle: true
            });
        }
    }

    class BrailleTeacher {
        constructor() {
            this.port = null;
            this.introDone = false;
            this.reader = null;
            this.mode = "learning";

            this.lastInput = "";
            this.connectToSerial()

        
            this.currentLetterIndex = 0;
            this.correctInputs = 0;
            this.totalInputs = 0;
            this.progressChart = null;
            this.heatmapChart = null;
            this.recognition = null;
            this.isListening = false;
            this.speechQueue = [];
            this.isSpeaking = false;
            this.alphabet = "abcdefghijklmnopqrstuvwxyz".split("");
            this.words = ["bat", "cat", "moon", "star", "tree", "bee", "sun", "ice"];
            this.currentWordIndex = 0;
            this.currentWordLetterIndex = 0;
            this.alphabetFolds = {
                "a": "1", "b": "1 and 2", "c": "1 and 4", "d": "1, 4, and 5",
                "e": "1 and 5", "f": "1, 2 and 4", "g": "1, 2, 4, and 5",
                "h": "1, 2, and 5", "i": "2 and 4", "j": "2, 4, and 5",
                "k": "1 and 3", "l": "1, 2, and 3", "m": "1, 3, and 4",
                "n": "1, 3, 4, and 5", "o": "1, 3, and 5", "p": "1, 2, 3, and 4",
                "q": "1, 2, 3, 4, and 5", "r": "1, 2, 3, and 5", "s": "2, 3, and 4",
                "t": "2, 3, 4, and 5", "u": "1, 3, and 6", "v": "1, 2, 3, and 6",
                "w": "2, 4, 5, and 6", "x": "1, 3, 4, and 6",
                "y": "1, 3, 4, 5, and 6", "z": "1, 3, 5, and 6"
            };
            this.errorCount = {}; // Track errors for each letter
            this.alphabet.forEach(letter => this.errorCount[letter] = 0); // Initialize error count for each letter
            this.initializeEventListeners();
            this.initProgressChart();
            this.initializeSpeechRecognition();
            this.brailleModel = new BrailleModel();
            this.trainingData = [];
            this.userHistory = [];
            this.errorPattern = Array(6).fill(0);
            this.brailleModel.initialize();
        }

        initializeSpeechRecognition() {
            if ('webkitSpeechRecognition' in window) {
                this.recognition = new webkitSpeechRecognition();
                this.recognition.continuous = true;
                this.recognition.interimResults = false;
                this.recognition.lang = 'en-US';
                this.recognition.onresult = (event) => {
                    const last = event.results.length - 1;
                    const command = event.results[last][0].transcript.trim().toLowerCase();
                    if (command.includes("learning mode") || command.includes("learning")) {
                        this.switchMode("learning");
                    } else if (command.includes("practice mode") || command.includes("practice")) {
                        this.switchMode("practice");
                    }
                };
                this.recognition.onerror = (event) => {
                    console.error('Speech recognition error:', event.error);
                    this.showStatus(`Speech recognition error: ${event.error}`);
                };
                this.recognition.onend = () => {
                    if (this.isListening) this.recognition.start();
                };
            }
        }

        startListening() {
            if (this.recognition && !this.isListening) {
                this.isListening = true;
                this.recognition.start();
                this.showStatus("Voice commands activated");
                this.speak("Voice commands are now active.");
            }
        }

        stopListening() {
            if (this.recognition && this.isListening) {
                this.isListening = false;
                this.recognition.stop();
                this.showStatus("Voice commands deactivated");
            }
        }

        switchMode(newMode) {
            this.mode = newMode;
            document.getElementById("modeSelect").value = newMode;
            this.resetState();
            if (this.mode === "learning") {
                this.speak(`Switching to learning mode. Let's start with letter ${this.alphabet[0].toUpperCase()}. Fold ${this.alphabetFolds[this.alphabet[0]]} for ${this.alphabet[0].toUpperCase()}.`);
            } else if (this.mode === "practice") {
                this.speak("Switching to practice mode.");
                setTimeout(() => this.announceCurrentWord(), 1000);
            }
        }

        async connectToSerial() {
            try {
                this.port = await navigator.serial.requestPort();
                await this.port.open({ baudRate: 9600 });
                const decoder = new TextDecoderStream();
                this.port.readable.pipeTo(decoder.writable);
                this.reader = decoder.readable.getReader();

                if (!this.introDone) {
                    await this.playIntroduction();
                    this.introDone = true;
                }

                this.showStatus("Connected successfully!");
                this.readSerialData();
                this.startListening();
            } catch (error) {
                this.showStatus(`Connection failed: ${error.message}`);
            }
        }

        async playIntroduction() {
            if (!this.port || !this.port.writable) {
                this.showStatus("Serial port not open, reconnecting...");
                await this.connectToSerial();
            }
        
            const writer = this.port.writable.getWriter();
            const fingers = [
                { num: 1, desc: "left ring finger" },
                { num: 2, desc: "left middle finger" },
                { num: 3, desc: "left index finger" },
                { num: 4, desc: "right index finger" },
                { num: 5, desc: "right middle finger" },
                { num: 6, desc: "right ring finger" }
            ];
        
            console.log("Starting introduction sequence...");
            this.speak("The finger mappings are", 1000, 1.5);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Initial delay
        
            for (const finger of fingers) {
                console.log(`Sending vibration signal for finger ${finger.num}`);
                await new Promise(resolve => setTimeout(resolve, 500));
        
                try {
                    await writer.write(new TextEncoder().encode(finger.num.toString())); // Send signal to the microcontroller
                    console.log(`Successfully sent: ${finger.num}`);
                } catch (error) {
                    console.error(`Error sending signal for finger ${finger.num}:`, error);
                }
        
                this.speak(`${finger.num} is your ${finger.desc}`, 500, 1.5);
                await new Promise(resolve => setTimeout(resolve, 1500));
            }
        
            try {   
                await writer.write(new TextEncoder().encode('X')); // End signal
                console.log("End signal sent successfully.");
            } catch (error) {
                console.error("Error sending end signal:", error);
            }
        
            writer.releaseLock();
            console.log("Introduction sequence completed.");
        }        

        
        async readSerialData() {
            try {
                while (true) {
                    const { value, done } = await this.reader.read();
                    if (done) break;
                    if (value) this.handleBrailleInput(value.trim());
                }
            } catch (error) {
                this.showStatus(`Error reading data: ${error.message}`);
            }
        }

        handleBrailleInput(data) {
            if (!data) return;
            if (data === this.lastInput) return; 
            this.lastInput = data; // Store the last input

            let outputText = "";
            try {
                if (this.mode === "learning") {
                    outputText = this.handleLearningMode(data);
                } else {
                    outputText = this.handlePracticeMode(data);
                }
                this.updateDisplay(outputText);
            } catch (error) {
                this.showStatus(`Error processing input: ${error.message}`);
            }
        }

        handleLearningMode(data) {
            const currentLetter = this.alphabet[this.currentLetterIndex];
            if (data.toLowerCase() === currentLetter) {
                this.speak(`It is Correct!`);
                this.correctInputs++;
                this.currentLetterIndex++;
                if (this.currentLetterIndex < this.alphabet.length) {
                    const nextLetter = this.alphabet[this.currentLetterIndex];
                    this.speak(`Now try ${nextLetter.toUpperCase()}. Fold ${this.alphabetFolds[nextLetter]}.`);
                } else {
                    this.speak("Completed alphabet! Switching to practice mode.");
                    this.switchMode("practice");
                }
            } else {
                this.speak(`  It is Incorrect. Please fold ${this.alphabetFolds[currentLetter]} for ${currentLetter.toUpperCase()}.`);
                this.errorCount[currentLetter]++; // Increment error count for the current letter
                this.updateHeatmap(); // Update the heatmap
            }
            this.totalInputs++;
            this.updateProgressChart();
            return currentLetter.toUpperCase();
        }

        updateHeatmap() {
            const ctx = document.getElementById('heatmapChart').getContext('2d');
            const labels = this.alphabet.map(letter => letter.toUpperCase());
            const data = labels.map(label => this.errorCount[label.toLowerCase()]);

            if (this.heatmapChart) {
                this.heatmapChart.data.labels = labels;
                this.heatmapChart.data.datasets[0].data = data;
                this.heatmapChart.update();
            } else {
                this.heatmapChart = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: labels,
                        datasets: [{
                            label: 'Error Count',
                            data: data,
                            backgroundColor: 'rgba(255, 99, 132, 0.2)',
                            borderColor: 'rgba(255, 99, 132, 1)',
                            borderWidth: 1
                        }]
                    },
                    options: {
                        responsive: true,
                        scales: {
                            y: {
                                beginAtZero: true,
                                title: {
                                    display: true,
                                    text: 'Error Count'
                                }
                            },
                            x: {
                                title: {
                                    display: true,
                                    text: 'Letters'
                                }
                            }
                        }
                    }
                });
            }
        }

        handlePracticeMode(data) {
            const currentWord = this.words[this.currentWordIndex];
            const currentLetter = currentWord[this.currentWordLetterIndex];
            if (data.toLowerCase() === currentLetter) {
                this.speak(currentLetter.toUpperCase());
                this.currentWordLetterIndex++;
                this.correctInputs++;
                if (this.currentWordLetterIndex === currentWord.length) {
                    this.speak(`Excellent! Completed ${currentWord.toUpperCase()}`);
                    this.currentWordIndex = (this.currentWordIndex + 1) % this.words.length;
                    this.currentWordLetterIndex = 0;
                    setTimeout(() => this.announceCurrentWord(), 2000);
                }
            } else {
                this.speak(`Incorrect, try again.`);
                this.errorCount[currentLetter]++; // Increment error count for the current letter
                this.updateHeatmap(); // Update the heatmap
                this.currentWordLetterIndex = 0;
                setTimeout(() => this.announceCurrentWord(), 2000);
            }
            this.totalInputs++;
            this.updateProgressChart();
            return currentWord.substring(0, this.currentWordLetterIndex).toUpperCase();
        }

        announceCurrentWord() {
            const currentWord = this.words[this.currentWordIndex];
            const letters = currentWord.toUpperCase().split('');
            this.speak(`Practice word: ${currentWord.toUpperCase()}`);
            letters.forEach((letter, index) => {
                setTimeout(() => {
                    this.speak(letter);
                    if (index === letters.length - 1) {
                        setTimeout(() => {
                            this.speak(`Start with ${this.alphabetFolds[currentWord[0]]} for ${currentWord[0].toUpperCase()}`);
                        }, 1000);
                    }
                }, (index + 1) * 1000);
            });
        }

        speak(text) {
            if (!text) return;
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 0.9;
            window.speechSynthesis.speak(utterance);
        }

        initProgressChart() {
            const ctx = document.getElementById('progressChart').getContext('2d');
            this.progressChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Accuracy (%)',
                        data: [],
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        borderColor: 'rgba(75, 192, 192, 1)',
                        borderWidth: 1,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: { beginAtZero: true, max: 100 },
                        x: { title: { display: true, text: 'Attempts' } }
                    }
                }
            });
        }

        updateProgressChart() {
            if (this.totalInputs > 0) {
                const accuracy = (this.correctInputs / this.totalInputs) * 100;
                if (this.progressChart.data.labels.length > 20) {
                    this.progressChart.data.labels.shift();
                    this.progressChart.data.datasets[0].data.shift();
                }
                this.progressChart.data.labels.push(this.totalInputs.toString());
                this.progressChart.data.datasets[0].data.push(accuracy.toFixed(2));
                this.progressChart.update();
            }
        }

        updateDisplay(text) {
            const display = document.getElementById("brailleOutput");
            if (display) display.textContent = text;
        }

        showStatus(message) {
            const status = document.getElementById("statusMessage");
            if (status) {
                status.textContent = message;
                setTimeout(() => status.textContent = "", 3000);
            }
        }

        resetState() {
            this.currentLetterIndex = 0;
            this.correctInputs = 0;
            this.totalInputs = 0;
            this.currentWordIndex = 0;
            this.currentWordLetterIndex = 0;
            this.progressChart.data.labels = [];
            this.progressChart.data.datasets[0].data = [];
            this.progressChart.update();
            this.updateDisplay("");
        }

        initializeEventListeners() {
            document.getElementById("connectBtn").addEventListener("click", () => this.connectToSerial());
            document.getElementById("modeSelect").addEventListener("change", (event) => {
                this.switchMode(event.target.value);
            });
        }
    }

    new BrailleTeacher();
} else {
    alert("Web Serial API not supported. Use Chrome or Edge.");
}