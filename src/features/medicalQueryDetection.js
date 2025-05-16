 "use strict"

 const medicalKeywords = [
     // English keywords
     'medicine', 'drug', 'medication', 'dosage', 'symptom', 'diagnosis', 'treatment',
     'disease', 'illness', 'condition', 'prescription', 'side effect', 'interact',
     'pill', 'tablet', 'capsule', 'injection', 'dose', 'therapy', 'medicate',

     // Italian medical keywords
     'medicina', 'farmaco', 'medicinale', 'dosaggio', 'sintomo', 'diagnosi', 'trattamento',
     'malattia', 'condizione', 'prescrizione', 'ricetta', 'effetto collaterale', 'interazione',
     'pillola', 'compressa', 'capsula', 'iniezione', 'dose', 'terapia', 'medicare',
     'cura', 'guarire', 'rimedio', 'integratore', 'vitamina', 'minerale', 'inalatore',
     'gocce', 'pomata', 'crema', 'sciroppo', 'cerotto', 'efficacia', 'funziona per',
     'cosa dovrei prendere', 'cosa posso usare', 'cosa aiuta con', 'posologia',
     'controindicazioni', 'indicazioni', 'foglietto illustrativo', 'bugiardino',
     'antidolorifico', 'antibiotico', 'antiinfiammatorio', 'antipiretico',
     'farmacia', 'farmacista', 'dottore', 'febbre', 'dolore', 'infezione'

 ];

 /**
  * Analyzes a prompt to determine if it's medical-related
  *
  * @param {string} prompt - User prompt
  * @returns {boolean} - True if medical-related
  */

 module.exports = function (prompt) {
     const lowercasePrompt = prompt.toLowerCase();
     return medicalKeywords.some(keyword => lowercasePrompt.includes(keyword));
 }

