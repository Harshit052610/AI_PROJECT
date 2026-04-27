import fetch from 'node-fetch';

const LOCATIONIQ_API_KEY = 'pk.ef423b51534f51549c9d54f6fbd88d65';
const profile = 'driving';
const coordinates = '80.6480,16.5062;80.6490,16.5072'; // Vijayawada
const url = `https://us1.locationiq.com/v1/directions/${profile}/${coordinates}?key=${LOCATIONIQ_API_KEY}&overview=full`;

async function test() {
    try {
        const response = await fetch(url);
        console.log('Status:', response.status);
        const data = await response.json();
        console.log('Data:', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error:', error);
    }
}

test();
