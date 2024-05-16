const Header = () => {
  return (
    <header>
      <nav className="navbar-header">
        <label htmlFor="search" className="search">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input type="search" name="search" id="search" placeholder="Search..."/>
        </label>
        <button>Search</button>
      </nav>
    </header>
  );
};

export default Header;
