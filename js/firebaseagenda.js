
 // Configuração do seu Firebase (troque pelos dados do seu projeto)
    const firebaseConfig = {
      apiKey: "AIzaSyCfKOYVh7UPkulnVv28pHLS2jciuIGhe8w",
      authDomain: "planodeestudos-fa5fc.firebaseapp.com",
      projectId: "planodeestudos-fa5fc",
      storageBucket: "planodeestudos-fa5fc.firebasestorage.app",
      messagingSenderId: "1048319185328",
      appId: "1:1048319185328:web:6822dc8806315b7f60c675"
    };

    // Inicializa o Firebase
    firebase.initializeApp(firebaseConfig);

    // Inicializa Firestore
    const db = firebase.firestore();