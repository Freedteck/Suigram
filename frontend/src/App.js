import "./App.css";
import LeftSideBar from "./components/LeftSideBar";
import Main from "./components/Main";
import RightSideBar from "./components/RightSideBar";
function App() {
  return (
    <div className="App">
      <div className="content">
        <LeftSideBar />
        <Main />
        <RightSideBar />
      </div>
    </div>
  );
}

export default App;
